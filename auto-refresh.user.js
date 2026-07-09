
// ==UserScript==
// @name         自动刷新网页脚本 (带控制面板)
// @namespace    http://tampermonkey.net/
// @version      1.1.2
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

    let minRefreshInterval = parseInt(localStorage.getItem(REFRESH_MIN_INTERVAL_KEY)) || 5000; // 默认5秒
    let maxRefreshInterval = parseInt(localStorage.getItem(REFRESH_MAX_INTERVAL_KEY)) || 10000; // 默认10秒
    let isRefreshEnabled = localStorage.getItem(IS_REFRESH_ENABLED_KEY) === 'true';
    let refreshTimer = null;

    // --- UI Styles ---
    GM_addStyle(`
        #${SCRIPT_NAME}-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 280px;
            background-color: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
            padding: 20px;
            z-index: 99999;
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
            color: #333;
            cursor: grab;
            transition: all 0.2s ease-in-out;
        }
        #${SCRIPT_NAME}-panel:hover {
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }
        #${SCRIPT_NAME}-panel h4 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #007bff;
            text-align: center;
            font-size: 18px;
            font-weight: 600;
        }
        #${SCRIPT_NAME}-panel label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #555;
        }
        #${SCRIPT_NAME}-panel input[type="number"] {
            width: calc(100% - 24px);
            padding: 10px;
            margin-bottom: 15px;
            border: 1px solid #ced4da;
            border-radius: 6px;
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        #${SCRIPT_NAME}-panel input[type="number"]:focus {
            border-color: #80bdff;
            outline: 0;
            box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        #${SCRIPT_NAME}-panel button {
            background-color: #007bff;
            color: white;
            padding: 12px 15px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            width: 100%;
            margin-bottom: 10px;
            font-size: 15px;
            font-weight: 600;
            transition: background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        #${SCRIPT_NAME}-panel button:hover {
            background-color: #0056b3;
            box-shadow: 0 4px 10px rgba(0, 123, 255, 0.3);
        }
        #${SCRIPT_NAME}-panel button:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
            box-shadow: none;
        }
        #${SCRIPT_NAME}-panel button#${SCRIPT_NAME}-stop-btn {
            background-color: #dc3545;
        }
        #${SCRIPT_NAME}-panel button#${SCRIPT_NAME}-stop-btn:hover {
            background-color: #c82333;
            box-shadow: 0 4px 10px rgba(220, 53, 69, 0.3);
        }
        #${SCRIPT_NAME}-status {
            text-align: center;
            margin-top: 15px;
            font-weight: 600;
            color: #28a745;
            font-size: 15px;
        }
        #${SCRIPT_NAME}-status.disabled {
            color: #dc3545;
        }
        #${SCRIPT_NAME}-close-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #999;
            width: auto;
            padding: 0 8px;
            margin: 0;
            line-height: 1;
            transition: color 0.2s ease-in-out;
        }
        #${SCRIPT_NAME}-close-btn:hover {
            color: #333;
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
                statusElement.textContent = '状态: 运行中';
                statusElement.classList.remove('disabled');
            } else {
                statusElement.textContent = '状态: 已停止';
                statusElement.classList.add('disabled');
            }
        }
    }

    function updateStatus(message) {
        const statusElement = document.getElementById(`${SCRIPT_NAME}-status`);
        if (statusElement) {
            statusElement.textContent = `状态: ${message}`;
        }
    }

    // --- UI Creation ---
    function createPanel() {
        const panel = document.createElement('div');
        panel.id = `${SCRIPT_NAME}-panel`;
        panel.innerHTML = `
            <button id="${SCRIPT_NAME}-close-btn">×</button>
            <h4>自动刷新设置</h4>
            <label for="${SCRIPT_NAME}-min-interval">最小间隔 (毫秒):</label>
            <input type="number" id="${SCRIPT_NAME}-min-interval" value="${minRefreshInterval}" min="1000">
            <label for="${SCRIPT_NAME}-max-interval">最大间隔 (毫秒):</label>
            <input type="number" id="${SCRIPT_NAME}-max-interval" value="${maxRefreshInterval}" min="1000">
            <button id="${SCRIPT_NAME}-start-btn">开始刷新</button>
            <button id="${SCRIPT_NAME}-stop-btn">停止刷新</button>
            <div id="${SCRIPT_NAME}-status">状态: ${isRefreshEnabled ? '运行中' : '已停止'}</div>
        `;
        document.body.appendChild(panel);

        // Make panel draggable
        let isDragging = false;
        let offsetX, offsetY;

        panel.addEventListener('mousedown', (e) => {
            if (e.target.id === `${SCRIPT_NAME}-close-btn`) return; // Don't drag when clicking close button
            isDragging = true;
            offsetX = e.clientX - panel.getBoundingClientRect().left;
            offsetY = e.clientY - panel.getBoundingClientRect().top;
            panel.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.left = `${e.clientX - offsetX}px`;
            panel.style.top = `${e.clientY - offsetY}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            panel.style.cursor = 'grab';
        });

        // Event Listeners for controls
        document.getElementById(`${SCRIPT_NAME}-close-btn`).addEventListener('click', () => {
            panel.style.display = 'none';
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
