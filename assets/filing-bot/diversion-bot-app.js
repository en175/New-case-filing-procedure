const { createApp, ref, computed, nextTick } = Vue;

createApp({
    setup() {
        const messages = ref([]);
        const inputText = ref('');
        const aiIsThinking = ref(false);
        const resultReady = ref(false);
        const confirmModal = ref({
            show: false,
            type: '',
            title: '',
            message: ''
        });
        const chatScroll = ref(null);
        const stepIndex = ref(0);
        let messageId = 0;

        const flowSteps = [
            {
                guide: '请说明您本次来广仲办理的事项。',
                placeholder: '请根据 AI 引导输入，例如：我来广仲申请立案',
                demo: '我来广仲申请立案',
                reply: '您来立案是否有管辖条款？请提供合同、订单或协议中约定仲裁机构的条款内容。'
            },
            {
                guide: '请补充仲裁条款或管辖依据。',
                placeholder: '请输入仲裁条款，例如：合同第十二条约定提交广州仲裁委员会仲裁',
                demo: '有的，在合同第十二条约定：因本合同产生的争议，提交广州仲裁委员会仲裁。',
                reply: '好的，已经核对条款中包含广州仲裁委员会约定。您的具体请求是什么？请先说第一项请求及金额。'
            },
            {
                guide: '请补充第一项请求和金额。',
                placeholder: '请输入第一项请求，例如：请求退还培训费 15800 元',
                demo: '我的第一项请求是要求对方退还培训服务费 15800 元。',
                reply: '对于第一项请求中您方主张对方还款或退款的事实依据和合同依据分别是什么？'
            },
            {
                guide: '请补充第一项请求对应的事实依据和合同依据。',
                placeholder: '请分别输入事实依据、合同依据，例如：事实依据是……合同依据是……',
                demo: '事实依据是我已经支付 15800 元，但对方没有按约安排核心课程，多次申请退款未果。合同依据是合同约定课程服务内容和退款处理规则。',
                reply: '好的，已记录。接下来我会按每一项请求继续分析事实和法律依据。除退款外，是否还请求对方承担仲裁费、违约金、利息或其他费用？'
            },
            {
                guide: '请补充其他请求，没有也可以说明没有。',
                placeholder: '请输入其他请求，例如：请求对方承担仲裁费；没有其他请求可写“暂无其他请求”',
                demo: '第二项请求是要求对方承担本案仲裁费，暂不主张违约金和利息。',
                reply: '好的，已记录。请列出支撑上述请求的关键证据材料。'
            },
            {
                guide: '请补充关键证据材料。',
                placeholder: '请输入证据材料，例如：合同、付款凭证、聊天记录、退款申请记录',
                demo: '证据包括培训服务合同、付款凭证、微信沟通记录、退款申请记录、课程未开课通知。',
                reply: '好的，已记录。我已完成管辖条款、请求事项、事实依据和证据材料的初步梳理，下面给出本轮分流建议。'
            }
        ];

        const escapeHtml = (text) => String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        const scrollToBottom = () => {
            nextTick(() => {
                if (chatScroll.value) chatScroll.value.scrollTop = chatScroll.value.scrollHeight;
            });
        };

        const addAssistant = (content) => {
            messages.value.push({
                id: ++messageId,
                role: 'assistant',
                content,
                streaming: false
            });
            scrollToBottom();
        };

        const addUser = (content) => {
            messages.value.push({
                id: ++messageId,
                role: 'user',
                content: escapeHtml(content),
                streaming: false
            });
            scrollToBottom();
        };

        const currentStep = computed(() => flowSteps[Math.min(stepIndex.value, flowSteps.length - 1)]);
        const currentGuide = computed(() => resultReady.value ? '本轮分析已完成，请选择后续路径。' : currentStep.value.guide);
        const currentPlaceholder = computed(() => resultReady.value ? '本轮分析已完成，可选择调解或仲裁路径' : currentStep.value.placeholder);

        const sendMessage = () => {
            const text = inputText.value.trim();
            if (!text || aiIsThinking.value || resultReady.value) return;
            const step = currentStep.value;
            addUser(text);
            inputText.value = '';
            aiIsThinking.value = true;
            window.setTimeout(() => {
                aiIsThinking.value = false;
                addAssistant(`<div class="ai-reply-lead">${step.reply}</div>`);
                if (stepIndex.value >= flowSteps.length - 1) {
                    resultReady.value = true;
                } else {
                    stepIndex.value += 1;
                }
                scrollToBottom();
            }, 420);
        };

        const playDemoNextStep = () => {
            if (aiIsThinking.value || resultReady.value) return;
            inputText.value = currentStep.value.demo;
            sendMessage();
        };

        const showConfirmModal = (type) => {
            confirmModal.value.type = type;
            if (type === 'mediation') {
                confirmModal.value.title = '确认选择调解？';
                confirmModal.value.message = '您的案件将优先进入调解意向登记和沟通环节；调解以双方自愿为前提，若对方不同意或调解不成，仍可保留仲裁路径。';
            } else if (type === 'withdraw') {
                confirmModal.value.title = '确认撤回案件？';
                confirmModal.value.message = '是否撤回本案件的仲裁立案申请，撤回后本案件将移入草稿箱。';
            } else if (type === 'arbitration') {
                confirmModal.value.title = '联系客服仲裁？';
                confirmModal.value.message = '是否确认联系客服进行仲裁，确认后三个工作日内会有工作人员与您联系。';
            }
            confirmModal.value.show = true;
        };

        const closeConfirmModal = () => {
            confirmModal.value.show = false;
        };

        const confirmMediation = () => {
            try {
                const completed = JSON.parse(localStorage.getItem('filingDemoCompletedPaths') || '{}');
                completed.mediation = true;
                localStorage.setItem('filingDemoCompletedPaths', JSON.stringify(completed));
                localStorage.setItem('filingDemoSelectedRoute', 'mediation');
            } catch (error) {}
            window.location.href = './调解申请提交结果.html';
        };

        const chooseArbitration = () => {
            try {
                localStorage.setItem('filingDemoSelectedRoute', 'arbitration');
            } catch (error) {}
            window.location.href = './立案提交后路径选择.html';
        };

        const confirmWithdraw = () => {
            try {
                const completed = JSON.parse(localStorage.getItem('filingDemoCompletedPaths') || '{}');
                completed.withdraw = true;
                localStorage.setItem('filingDemoCompletedPaths', JSON.stringify(completed));
                localStorage.setItem('filingDemoSelectedRoute', 'withdraw');
            } catch (error) {}
            confirmModal.value.type = 'withdrawDone';
            confirmModal.value.title = '已撤回案件';
            confirmModal.value.message = '已为您撤回案件，可返回“草稿”查看。';
        };

        const executeConfirmAction = () => {
            const type = confirmModal.value.type;
            if (type === 'mediation') {
                closeConfirmModal();
                confirmMediation();
                return;
            }
            if (type === 'arbitration') {
                closeConfirmModal();
                chooseArbitration();
                return;
            }
            if (type === 'withdraw') {
                confirmWithdraw();
            }
        };

        addAssistant('<div class="ai-reply-lead">您好，欢迎来到广州仲裁委员会，请问我能为您做什么？</div>');

        return {
            messages,
            inputText,
            aiIsThinking,
            resultReady,
            confirmModal,
            chatScroll,
            currentGuide,
            currentPlaceholder,
            sendMessage,
            playDemoNextStep,
            showConfirmModal,
            chooseArbitration,
            closeConfirmModal,
            executeConfirmAction
        };
    }
}).mount('#app');
