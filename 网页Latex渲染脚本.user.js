// ==UserScript==
// @name         Latex 渲染器 (Ctrl+M 切换)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  按下 Ctrl + M 渲染网页中符合 LaTeX 语法的文本，再次按下则恢复。支持行内 $...$ 和块级 $$...$$。
// @author       AI-Assistant
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @require      https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js
// @require      https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js
// @resource     KATEX_CSS https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css
// ==/UserScript==

(function() {
    'use strict';

    // 加载 KaTeX 样式
    const katexCss = GM_getResourceText("KATEX_CSS");
    GM_addStyle(katexCss);

    let isRendered = false;
    const CLASS_NAME = 'tm-latex-rendered';

    // 配置渲染参数
    const renderOptions = {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
        ],
        throwOnError: false
    };

    /**
     * 渲染逻辑：遍历文本节点并包装渲染
     */
    function renderLatex() {
        // 查找所有包含 $ 符号且尚未被渲染的文本节点
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (node.parentElement.tagName === 'SCRIPT' ||
                    node.parentElement.tagName === 'STYLE' ||
                    node.parentElement.tagName === 'TEXTAREA' ||
                    node.parentElement.closest('.' + CLASS_NAME)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return (node.textContent.includes('$')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });

        let node;
        const nodesToProcess = [];
        while (node = walker.nextNode()) {
            nodesToProcess.push(node);
        }

        nodesToProcess.forEach(textNode => {
            const parent = textNode.parentElement;
            if (!parent) return;

            // 为了能恢复，我们将原始文本存入一个 span
            const wrapper = document.createElement('span');
            wrapper.className = CLASS_NAME;
            wrapper.dataset.originalContent = textNode.textContent; // 备份原文

            textNode.parentNode.insertBefore(wrapper, textNode);
            wrapper.appendChild(textNode);

            // 执行渲染
            renderMathInElement(wrapper, renderOptions);
        });
    }

    /**
     * 恢复逻辑：将渲染后的内容替换回原文
     */
    function restoreOriginal() {
        const renderedElements = document.querySelectorAll('.' + CLASS_NAME);
        renderedElements.forEach(el => {
            const originalText = el.dataset.originalContent;
            const textNode = document.createTextNode(originalText);
            el.parentNode.replaceChild(textNode, el);
        });
    }

    /**
     * 快捷键监听
     */
    window.addEventListener('keydown', function(e) {
        // 监听 Ctrl + M (M键的 keyCode 是 77)
        if (e.ctrlKey && e.key.toLowerCase() === 'm') {
            e.preventDefault(); // 阻止浏览器默认行为

            if (!isRendered) {
                renderLatex();
                console.log("Latex Rendered");
            } else {
                restoreOriginal();
                console.log("Latex Restored");
            }
            isRendered = !isRendered;
        }
    });

    console.log("Latex Renderer script loaded. Press Ctrl+M to toggle.");
})();