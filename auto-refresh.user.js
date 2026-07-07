
// ==UserScript==
// @name         自动刷新网页脚本
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  可自定义刷新间隔的网页自动刷新脚本，支持在线更新。
// @author       Manus AI
// @match        *://*/*
// @grant        window.localStorage
// @updateURL    https://raw.githubusercontent.com/renninaomi/scripts/main/auto-refresh.user.js
// @downloadURL  https://raw.githubusercontent.com/renninaomi/scripts/main/auto-refresh.user.js
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_NAME = 'AutoRefreshScript';
    const REFRESH_INTERVAL_KEY = SCRIPT_NAME + '_refreshInterval';
    const IS_REFRESH_ENABLED_KEY = SCRIPT_NAME + '_isRefreshEnabled';

    let refreshInterval = parseInt(localStorage.getItem(REFRESH_INTERVAL_KEY)) || 5000; // 默认5秒
    let isRefreshEnabled = localStorage.getItem(IS_REFRESH_ENABLED_KEY) === 'true';

    function startRefresh() {
        if (isRefreshEnabled) {
            console.log(`[${SCRIPT_NAME}] 网页将在 ${refreshInterval / 1000} 秒后刷新...`);
            setTimeout(function() {
                location.reload();
            }, refreshInterval);
        }
    }

    function setupScript() {
        if (confirm(`[${SCRIPT_NAME}] 是否启用自动刷新功能？`)) {
            let input = prompt(`[${SCRIPT_NAME}] 请输入刷新间隔（毫秒），当前为 ${refreshInterval} 毫秒：`, refreshInterval);
            let newInterval = parseInt(input);

            if (!isNaN(newInterval) && newInterval > 0) {
                refreshInterval = newInterval;
                localStorage.setItem(REFRESH_INTERVAL_KEY, refreshInterval);
                isRefreshEnabled = true;
                localStorage.setItem(IS_REFRESH_ENABLED_KEY, 'true');
                alert(`[${SCRIPT_NAME}] 自动刷新已启用，间隔设置为 ${refreshInterval} 毫秒。`);
                startRefresh();
            } else {
                alert(`[${SCRIPT_NAME}] 无效的刷新间隔，自动刷新未启用。`);
                isRefreshEnabled = false;
                localStorage.setItem(IS_REFRESH_ENABLED_KEY, 'false');
            }
        } else {
            isRefreshEnabled = false;
            localStorage.setItem(IS_REFRESH_ENABLED_KEY, 'false');
            alert(`[${SCRIPT_NAME}] 自动刷新已禁用。`);
        }
    }

    // 首次加载页面时，如果未设置或已禁用，则询问用户是否启用
    if (localStorage.getItem(IS_REFRESH_ENABLED_KEY) === null) {
        setupScript();
    } else if (isRefreshEnabled) {
        startRefresh();
    }

    // 添加一个菜单项，允许用户随时修改设置
    GM_registerMenuCommand(`[${SCRIPT_NAME}] 设置自动刷新`, setupScript);
    GM_registerMenuCommand(`[${SCRIPT_NAME}] 禁用自动刷新`, function() {
        isRefreshEnabled = false;
        localStorage.setItem(IS_REFRESH_ENABLED_KEY, 'false');
        alert(`[${SCRIPT_NAME}] 自动刷新已禁用。`);
        location.reload(); // 禁用后刷新页面以停止计时器
    });
    GM_registerMenuCommand(`[${SCRIPT_NAME}] 启用自动刷新`, function() {
        isRefreshEnabled = true;
        localStorage.setItem(IS_REFRESH_ENABLED_KEY, 'true');
        alert(`[${SCRIPT_NAME}] 自动刷新已启用。`);
        location.reload(); // 启用后刷新页面以启动计时器
    });

})();
