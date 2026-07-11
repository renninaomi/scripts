
// ==UserScript==
// @name         自动刷新网页脚本 (带控制面板)
// @namespace    http://tampermonkey.net/
// @version      1.2.3
// @description  可自定义刷新间隔、支持随机间隔的网页自动刷新脚本，带浮动控制面板，支持在线更新。
// @author       inner
// @match        *://*/*
// @grant        window.localStorage
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/renninaomi/scripts/main/auto-refresh.user.js
// @downloadURL  https://raw.githubusercontent.com/renninaomi/scripts/main/auto-refresh.user.js
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_NAME = 'AutoRefreshScript';
    const REFRESH_MIN_INTERVAL_KEY = SCRIPT_NAME + '_minRefreshInterval';
    const REFRESH_MAX_INTERVAL_KEY = SCRIPT_NAME + '_maxRefreshInterval';
    const IS_REFRESH_ENABLED_KEY = SCRIPT_NAME + '_isRefreshEnabled';
    const REFRESH_COUNT_KEY = SCRIPT_NAME + '_refreshCount';
    const PANEL_COLLAPSED_KEY = SCRIPT_NAME + '_panelCollapsed';
    const PANEL_POSITION_KEY = SCRIPT_NAME + '_panelPosition';
    const MINI_ICON_POSITION_KEY = SCRIPT_NAME + '_miniIconPosition';

    let minRefreshInterval = parseInt(localStorage.getItem(REFRESH_MIN_INTERVAL_KEY)) || 5000; // 默认5秒
    let maxRefreshInterval = parseInt(localStorage.getItem(REFRESH_MAX_INTERVAL_KEY)) || 10000; // 默认10秒
    let isRefreshEnabled = localStorage.getItem(IS_REFRESH_ENABLED_KEY) === 'true';
    let refreshCount = parseInt(localStorage.getItem(REFRESH_COUNT_KEY)) || 0;
    let isPanelCollapsed = localStorage.getItem(PANEL_COLLAPSED_KEY) !== 'false'; // 默认折叠
    let refreshTimer = null;
    
    // 加载保存的位置
    let panelPosition = JSON.parse(localStorage.getItem(PANEL_POSITION_KEY)) || null;
    let miniIconPosition = JSON.parse(localStorage.getItem(MINI_ICON_POSITION_KEY)) || null;

    // --- UI Styles ---
    GM_addStyle(`
        /* ====== 主面板 ====== */
        #${SCRIPT_NAME}-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            border: none;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
            padding: 0;
            z-index: 99999;
            font-family: 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
            font-size: 14px;
            color: #e0e0e0;
            cursor: grab;
            overflow: hidden;
            backdrop-filter: blur(10px);
        }
        #${SCRIPT_NAME}-panel:hover {
            box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15);
        }
        #${SCRIPT_NAME}-panel * {
            box-sizing: border-box;
        }

        /* ====== 标题栏 ====== */
        #${SCRIPT_NAME}-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        #${SCRIPT_NAME}-panel-header h4 {
            margin: 0;
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        #${SCRIPT_NAME}-close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 50%;
            font-size: 16px;
            cursor: pointer;
            color: #a0a0a0;
            transition: all 0.2s ease;
            padding: 0;
            line-height: 1;
        }
        #${SCRIPT_NAME}-close-btn:hover {
            background: rgba(255, 255, 255, 0.25);
            color: #ffffff;
            border-color: rgba(255, 255, 255, 0.4);
        }

        /* ====== 内容区域 ====== */
        #${SCRIPT_NAME}-panel-content {
            padding: 20px;
        }

        /* ====== 输入组 ====== */
        #${SCRIPT_NAME}-panel label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #b0b0b0;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }
        #${SCRIPT_NAME}-panel .input-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
        }
        #${SCRIPT_NAME}-panel .input-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 44px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 8px 0 0 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-right: none;
            color: #64b5f6;
            font-size: 18px;
        }
        #${SCRIPT_NAME}-panel input[type="number"] {
            flex: 1;
            height: 44px;
            padding: 0 12px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 0 8px 8px 0;
            background: rgba(255, 255, 255, 0.08);
            font-size: 15px;
            font-weight: 500;
            color: #ffffff;
            transition: all 0.2s ease;
        }
        #${SCRIPT_NAME}-panel input[type="number"]:focus {
            border-color: #64b5f6;
            background: rgba(100, 181, 246, 0.1);
            box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.2);
            outline: none;
        }
        #${SCRIPT_NAME}-panel input[type="number"]::-webkit-inner-spin-button,
        #${SCRIPT_NAME}-panel input[type="number"]::-webkit-outer-spin-button {
            opacity: 0.5;
        }

        /* ====== 按钮组 ====== */
        #${SCRIPT_NAME}-panel .btn-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        #${SCRIPT_NAME}-panel button {
            flex: 1;
            height: 44px;
            padding: 0 16px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.3px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        #${SCRIPT_NAME}-start-btn {
            background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
        }
        #${SCRIPT_NAME}-start-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #43a047 0%, #5cb860 100%);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.5);
            transform: translateY(-2px);
        }
        #${SCRIPT_NAME}-start-btn:active:not(:disabled) {
            transform: translateY(0);
        }
        #${SCRIPT_NAME}-stop-btn {
            background: linear-gradient(135deg, #f44336 0%, #ef5350 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
        }
        #${SCRIPT_NAME}-stop-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #e53935 0%, #ef4444 100%);
            box-shadow: 0 6px 20px rgba(244, 67, 54, 0.5);
            transform: translateY(-2px);
        }
        #${SCRIPT_NAME}-stop-btn:active:not(:disabled) {
            transform: translateY(0);
        }
        #${SCRIPT_NAME}-panel button:disabled {
            background: rgba(255, 255, 255, 0.1);
            color: #666;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
        }

        /* ====== 状态栏 ====== */
        #${SCRIPT_NAME}-status {
            text-align: center;
            margin-top: 16px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 13px;
            font-weight: 500;
            color: #b0b0b0;
            transition: all 0.3s ease;
        }
        #${SCRIPT_NAME}-status.active {
            color: #4caf50;
            background: rgba(76, 175, 80, 0.1);
            border-color: rgba(76, 175, 80, 0.3);
        }
        #${SCRIPT_NAME}-status.disabled {
            color: #f44336;
            background: rgba(244, 67, 54, 0.1);
            border-color: rgba(244, 67, 54, 0.3);
        }
        #${SCRIPT_NAME}-status .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        #${SCRIPT_NAME}-status.active .status-dot {
            background: #4caf50;
            box-shadow: 0 0 10px rgba(76, 175, 80, 0.6);
        }
        #${SCRIPT_NAME}-status.disabled .status-dot {
            background: #f44336;
            animation: none;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* ====== 拖拽手柄 ====== */
        #${SCRIPT_NAME}-drag-handle {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
            margin-bottom: 8px;
        }

        /* ====== 折叠后的迷你图标 ====== */
        #${SCRIPT_NAME}-mini-icon {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            background: rgba(40, 44, 52, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 50%;
            cursor: grab;
            z-index: 99999;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #a0a0a0;
            font-size: 20px;
            line-height: 1;
            user-select: none;
        }
        #${SCRIPT_NAME}-mini-icon:active {
            cursor: grabbing;
            transform: scale(0.95);
        }
        #${SCRIPT_NAME}-mini-icon:hover {
            background: rgba(100, 181, 246, 0.2);
            color: #64b5f6;
            box-shadow: 0 6px 20px rgba(100, 181, 246, 0.3);
            transform: scale(1.1);
        }
        #${SCRIPT_NAME}-panel.collapsed {
            display: none;
        }

        /* ====== 刷新计数器 ====== */
        #${SCRIPT_NAME}-counter {
            text-align: center;
            margin-top: 12px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 12px;
            color: #888;
        }
        #${SCRIPT_NAME}-counter span {
            color: #64b5f6;
            font-weight: 600;
        }
    `);

    // --- Functions ---
    function getRandomInterval() {
        if (minRefreshInterval > maxRefreshInterval) {
            [minRefreshInterval, maxRefreshInterval] = [maxRefreshInterval, minRefreshInterval]; // 确保min <= max
        }
        return Math.floor(Math.random() * (maxRefreshInterval - minRefreshInterval + 1)) + minRefreshInterval;
    }

    function startRefresh() {
        if (isRefreshEnabled) {
            const currentInterval = getRandomInterval();
            console.log(`[${SCRIPT_NAME}] 网页将在 ${currentInterval / 1000} 秒后刷新...`);
            updateStatus(`下次刷新: ${currentInterval / 1000} 秒`);
            refreshTimer = setTimeout(function() {
                refreshCount++;
                localStorage.setItem(REFRESH_COUNT_KEY, refreshCount);
                location.reload();
            }, currentInterval);
        }
    }

    function stopRefresh() {
        clearTimeout(refreshTimer);
        refreshTimer = null;
        isRefreshEnabled = false;
        localStorage.setItem(IS_REFRESH_ENABLED_KEY, 'false');
        updatePanelState();
        updateStatus('已停止');
        console.log(`[${SCRIPT_NAME}] 自动刷新已停止。`);
    }

    function updatePanelState() {
        const minInput = document.getElementById(`${SCRIPT_NAME}-min-interval`);
        const maxInput = document.getElementById(`${SCRIPT_NAME}-max-interval`);
        const startBtn = document.getElementById(`${SCRIPT_NAME}-start-btn`);
        const stopBtn = document.getElementById(`${SCRIPT_NAME}-stop-btn`);
        const statusElement = document.getElementById(`${SCRIPT_NAME}-status`);

        if (minInput) minInput.value = minRefreshInterval;
        if (maxInput) maxInput.value = maxRefreshInterval;
        if (startBtn) startBtn.disabled = isRefreshEnabled;
        if (stopBtn) stopBtn.disabled = !isRefreshEnabled;
        
        if (statusElement) {
            if (isRefreshEnabled) {
                statusElement.innerHTML = '<span class="status-dot"></span> 运行中';
                statusElement.classList.remove('disabled');
                statusElement.classList.add('active');
            } else {
                statusElement.innerHTML = '<span class="status-dot"></span> 已停止';
                statusElement.classList.add('disabled');
                statusElement.classList.remove('active');
            }
        }
    }

    function updateStatus(message) {
        const statusElement = document.getElementById(`${SCRIPT_NAME}-status`);
        if (statusElement) {
            statusElement.innerHTML = `<span class="status-dot"></span> ${message}`;
            statusElement.classList.add('active');
            statusElement.classList.remove('disabled');
        }
    }

    // --- UI Creation ---
    function createPanel() {
        const panel = document.createElement('div');
        panel.id = `${SCRIPT_NAME}-panel`;
        panel.innerHTML = `
            <div id="${SCRIPT_NAME}-panel-header">
                <h4>⚡ 自动刷新设置</h4>
                <button id="${SCRIPT_NAME}-close-btn" title="收起面板">—</button>
            </div>
            <div id="${SCRIPT_NAME}-panel-content">
                <label for="${SCRIPT_NAME}-min-interval">最小间隔 (毫秒)</label>
                <div class="input-group">
                    <div class="input-icon">⏱</div>
                    <input type="number" id="${SCRIPT_NAME}-min-interval" value="${minRefreshInterval}" min="1000" placeholder="5000">
                </div>
                
                <label for="${SCRIPT_NAME}-max-interval">最大间隔 (毫秒)</label>
                <div class="input-group">
                    <div class="input-icon">⏱</div>
                    <input type="number" id="${SCRIPT_NAME}-max-interval" value="${maxRefreshInterval}" min="1000" placeholder="10000">
                </div>
                
                <div class="btn-group">
                    <button id="${SCRIPT_NAME}-start-btn">
                        <span>▶</span> 开始
                    </button>
                    <button id="${SCRIPT_NAME}-stop-btn">
                        <span>⏹</span> 停止
                    </button>
                </div>
                
                <div id="${SCRIPT_NAME}-status">
                    <span class="status-dot"></span>
                    ${isRefreshEnabled ? '运行中' : '已停止'}
                </div>

                <div id="${SCRIPT_NAME}-counter">
                    已刷新 <span id="${SCRIPT_NAME}-count-display">${refreshCount}</span> 次
                </div>
            </div>
            <div id="${SCRIPT_NAME}-drag-handle"></div>
        `;
        document.body.appendChild(panel);
        
        // 应用保存的面板位置
        if (panelPosition) {
            panel.style.left = panelPosition.left;
            panel.style.top = panelPosition.top;
            panel.style.right = 'auto'; // 使用left定位时需要取消right
        }

        // Create mini icon for collapsed state
        const miniIcon = document.createElement('div');
        miniIcon.id = `${SCRIPT_NAME}-mini-icon`;
        miniIcon.title = '展开控制面板';
        miniIcon.innerHTML = '⚡';
        // 根据保存的状态决定初始显示
        if (isPanelCollapsed) {
            panel.style.display = 'none';
            miniIcon.style.display = 'flex';
            // 应用保存的悬浮球位置
            if (miniIconPosition) {
                miniIcon.style.left = miniIconPosition.left;
                miniIcon.style.top = miniIconPosition.top;
                miniIcon.style.right = 'auto'; // 使用left定位时需要取消right
            }
        } else {
            miniIcon.style.display = 'none';
        }
        document.body.appendChild(miniIcon);

        // --- Event Listeners ---
        
        // Close button -> Collapse to mini icon
        document.getElementById(`${SCRIPT_NAME}-close-btn`).addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent drag
            const rect = panel.getBoundingClientRect();
            miniIcon.style.top = `${rect.top + rect.height / 2 - 20}px`;
            miniIcon.style.left = `${rect.left + rect.width / 2 - 20}px`;
            miniIcon.style.right = 'auto'; // Reset fixed position
            
            panel.style.display = 'none';
            miniIcon.style.display = 'flex';
            // 保存面板折叠状态
            isPanelCollapsed = true;
            localStorage.setItem(PANEL_COLLAPSED_KEY, 'true');
            // 保存悬浮球位置（面板中心位置）
            miniIconPosition = {
                left: miniIcon.style.left,
                top: miniIcon.style.top
            };
            localStorage.setItem(MINI_ICON_POSITION_KEY, JSON.stringify(miniIconPosition));
        });

        // --- Dragging Logic ---
        let isDraggingPanel = false;
        let isDraggingIcon = false;
        let offsetX, offsetY;
        let iconStartX, iconStartY;

        // Panel Dragging
        panel.addEventListener('mousedown', (e) => {
            if (e.target.id === `${SCRIPT_NAME}-close-btn`) return;
            isDraggingPanel = true;
            offsetX = e.clientX - panel.getBoundingClientRect().left;
            offsetY = e.clientY - panel.getBoundingClientRect().top;
            panel.style.cursor = 'grabbing';
        });

        // Mini Icon Dragging
        miniIcon.addEventListener('mousedown', (e) => {
            isDraggingIcon = true;
            iconStartX = e.clientX;
            iconStartY = e.clientY;
            offsetX = e.clientX - miniIcon.getBoundingClientRect().left;
            offsetY = e.clientY - miniIcon.getBoundingClientRect().top;
            miniIcon.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (isDraggingPanel) {
                panel.style.left = `${e.clientX - offsetX}px`;
                panel.style.top = `${e.clientY - offsetY}px`;
            } else if (isDraggingIcon) {
                miniIcon.style.left = `${e.clientX - offsetX}px`;
                miniIcon.style.top = `${e.clientY - offsetY}px`;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (isDraggingPanel) {
                isDraggingPanel = false;
                panel.style.cursor = 'grab';
                // 保存面板位置
                panelPosition = {
                    left: panel.style.left,
                    top: panel.style.top
                };
                localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify(panelPosition));
            } else if (isDraggingIcon) {
                const dx = Math.abs(e.clientX - iconStartX);
                const dy = Math.abs(e.clientY - iconStartY);
                isDraggingIcon = false;
                miniIcon.style.cursor = 'grab';
                // 保存悬浮球位置
                miniIconPosition = {
                    left: miniIcon.style.left,
                    top: miniIcon.style.top
                };
                localStorage.setItem(MINI_ICON_POSITION_KEY, JSON.stringify(miniIconPosition));
                // Only expand if mouse barely moved (click, not drag)
                if (dx < 5 && dy < 5) {
                    miniIcon.style.display = 'none';
                    panel.style.display = 'block';
                    // 保存面板展开状态
                    isPanelCollapsed = false;
                    localStorage.setItem(PANEL_COLLAPSED_KEY, 'false');
                    // 将面板定位到悬浮球的位置
                    if (miniIconPosition) {
                        panel.style.left = miniIconPosition.left;
                        panel.style.top = miniIconPosition.top;
                        panelPosition = miniIconPosition;
                        localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify(panelPosition));
                    }
                }
            }
        });
        document.getElementById(`${SCRIPT_NAME}-min-interval`).addEventListener('change', (e) => {
            minRefreshInterval = Math.max(1000, parseInt(e.target.value));
            localStorage.setItem(REFRESH_MIN_INTERVAL_KEY, minRefreshInterval);
            e.target.value = minRefreshInterval; // Update input if value was less than min
        });

        document.getElementById(`${SCRIPT_NAME}-max-interval`).addEventListener('change', (e) => {
            maxRefreshInterval = Math.max(1000, parseInt(e.target.value));
            localStorage.setItem(REFRESH_MAX_INTERVAL_KEY, maxRefreshInterval);
            e.target.value = maxRefreshInterval; // Update input if value was less than min
        });

        document.getElementById(`${SCRIPT_NAME}-start-btn`).addEventListener('click', () => {
            isRefreshEnabled = true;
            localStorage.setItem(IS_REFRESH_ENABLED_KEY, 'true');
            updatePanelState();
            startRefresh();
        });

        document.getElementById(`${SCRIPT_NAME}-stop-btn`).addEventListener('click', () => {
            stopRefresh();
        });

        updatePanelState(); // Initial state update
    }

    // --- Initialization ---
    if (document.body) {
        createPanel();
        if (isRefreshEnabled) {
            startRefresh();
        }
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            createPanel();
            if (isRefreshEnabled) {
                startRefresh();
            }
        });
    }

})();
