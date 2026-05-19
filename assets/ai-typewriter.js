(function (window) {
    const defaultEscapeHtml = (text) => String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const isRef = (target) => target && (target.__v_isRef || 'value' in target);
    const getValue = (target) => (isRef(target) ? target.value : target);
    const setValue = (target, value) => {
        if (isRef(target)) target.value = value;
    };

    const defaultShouldStream = (rawText) => {
        return !/<(table|ol|ul|p|div|button|a|input|textarea|select|form|section)\b/i.test(rawText);
    };

    window.createAiTypewriter = function createAiTypewriter(options) {
        const config = options || {};
        const escapeHtml = config.escapeHtml || defaultEscapeHtml;
        const fallbackText = config.fallbackText || '';
        const replyDelay = Number.isFinite(config.replyDelay) ? config.replyDelay : 700;
        const charDelay = Number.isFinite(config.charDelay) ? config.charDelay : 28;
        const shouldStream = config.shouldStream || defaultShouldStream;
        let replyTimer = null;
        let streamTimer = null;

        const scrollToBottom = () => {
            if (typeof config.scrollToBottom === 'function') config.scrollToBottom();
        };

        const setThinking = (value) => {
            if (config.thinkingRef) setValue(config.thinkingRef, value);
            if (typeof config.setThinking === 'function') config.setThinking(value);
        };

        const nextId = () => {
            if (typeof config.nextId === 'function') return config.nextId();
            return Date.now();
        };

        const pushAssistantMessage = (message) => {
            const messages = getValue(config.messagesRef);
            if (!Array.isArray(messages)) return null;
            messages.push(message);
            return messages[messages.length - 1];
        };

        const clearReplyTimer = () => {
            if (replyTimer) {
                window.clearTimeout(replyTimer);
                replyTimer = null;
            }
        };

        const clearStreamTimer = () => {
            if (streamTimer) {
                window.clearInterval(streamTimer);
                streamTimer = null;
            }
        };

        const clear = () => {
            clearReplyTimer();
            clearStreamTimer();
        };

        const normalizeText = (text) => String(text)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?strong>/gi, '');

        const streamMessage = (text, streamOptions) => {
            const localOptions = streamOptions || {};
            clearReplyTimer();
            clearStreamTimer();

            const sourceText = String(text || fallbackText);
            const streamable = Object.prototype.hasOwnProperty.call(localOptions, 'stream')
                ? localOptions.stream
                : shouldStream(sourceText, localOptions);

            if (!streamable) {
                pushAssistantMessage({
                    id: nextId(),
                    role: 'assistant',
                    type: localOptions.type,
                    content: sourceText,
                    streaming: false
                });
                setThinking(false);
                scrollToBottom();
                return;
            }

            const before = localOptions.before || '';
            const after = localOptions.after || '';
            const rawText = typeof localOptions.toStreamText === 'function'
                ? localOptions.toStreamText(sourceText, localOptions)
                : sourceText;
            const normalizedText = normalizeText(rawText);
            const message = pushAssistantMessage({
                id: nextId(),
                role: 'assistant',
                type: localOptions.type,
                content: before + after,
                streaming: true
            });
            if (!message) {
                setThinking(false);
                return;
            }

            setThinking(false);
            let index = 0;
            let displayed = '';
            streamTimer = window.setInterval(() => {
                if (index < normalizedText.length) {
                    const char = normalizedText.charAt(index);
                    displayed += char === '\n' ? '<br>' : escapeHtml(char);
                    message.content = before + displayed + after;
                    index++;
                    scrollToBottom();
                    return;
                }

                message.streaming = false;
                clearStreamTimer();

                const completeHtml = typeof localOptions.afterCompleteHtml === 'function'
                    ? localOptions.afterCompleteHtml(message, rawText, localOptions)
                    : localOptions.afterCompleteHtml;
                if (completeHtml) message.content += completeHtml;

                if (typeof config.afterComplete === 'function') {
                    config.afterComplete(message, rawText, localOptions);
                }
                if (typeof localOptions.afterComplete === 'function') {
                    localOptions.afterComplete(message, rawText, localOptions);
                }
                scrollToBottom();
            }, charDelay);
        };

        const scheduleReply = (reply, delay, streamOptions) => {
            clearReplyTimer();
            replyTimer = window.setTimeout(() => {
                replyTimer = null;
                try {
                    const text = typeof reply === 'function' ? reply() : reply;
                    if (!text) {
                        setThinking(false);
                        scrollToBottom();
                        return;
                    }
                    streamMessage(text, streamOptions);
                } catch (error) {
                    setThinking(false);
                    streamMessage(fallbackText);
                }
            }, Number.isFinite(delay) ? delay : replyDelay);
        };

        return {
            streamMessage,
            scheduleReply,
            clearReplyTimer,
            clearStreamTimer,
            clear
        };
    };
})(window);
