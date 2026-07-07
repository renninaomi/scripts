
// ==UserScript==
// @name         自动刷新网页脚本 (带控制面板)
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  可自定义刷新间隔、支持随机间隔的网页自动刷新脚本，带浮动控制面板，支持在线更新。
// @author       Manus AI
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
            top: 10px;
            right: 10px;
            width: 250px;
            background-color: #f9f9f9;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            padding: 15px;
            z-index: 99999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            color: #333;
            cursor: grab;
        }
        #${SCRIPT_NAME}-panel h4 {
            margin-top: 0;
            margin-bottom: 10px;
            color: #0056b3;
            text-align: center;
        }
        #${SCRIPT_NAME}-panel label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        #${SCRIPT_NAME}-panel input[type="number"] {
            width: calc(100% - 20px);
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        #${SCRIPT_NAME}-panel button {
            background-color: #007bff;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            margin-bottom: 8px;
            font-size: 14px;
        }
        #${SCRIPT_NAME}-panel button:hover {
            background-color: #0056b3;
        }
        #${SCRIPT_NAME}-panel button#${SCRIPT_NAME}-stop-btn {
            background-color: #dc3545;
        }
        #${SCRIPT_NAME}-panel button#${SCRIPT_NAME}-stop-btn:hover {
            background-color: #c82333;
        }
        #${SCRIPT_NAME}-status {
            text-align: center;
            margin-top: 10px;
            font-weight: bold;
            color: #28a745;
        }
        #${SCRIPT_NAME}-status.disabled {
            color: #dc3545;
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
        document.getElementById(`${SCRIPT_NAME}-min-interval`).value = minRefreshInterval;
        document.getElementById(`${SCRIPT_NAME}-max-interval`).value = maxRefreshInterval;
        document.getElementById(`${SCRIPT_NAME}-start-btn`).disabled = isRefreshEnabled;
        document.getElementById(`${SCRIPT_NAME}-stop-btn`).disabled = !isRefreshEnabled;
        const statusElement = document.getElementById(`${SCRIPT_NAME}-status`);
        if (isRefreshEnabled) {
            statusElement.textContent = '状态: 运行中';
            statusElement.classList.remove('disabled');
        } else {
            statusElement.textContent = '状态: 已停止';
            statusElement.classList.add('disabled');
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
