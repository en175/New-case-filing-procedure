const { createApp, ref, nextTick } = Vue;

createApp({
    setup() {
        const messages = ref([]);
        const inputText = ref('');
        const aiIsThinking = ref(false);
        const resultReady = ref(false);
        const uploadedFiles = ref([]);
        const attachmentInput = ref(null);
        const confirmModal = ref({
            show: false,
            type: '',
            title: '',
            message: ''
        });
        const chatScroll = ref(null);
        const showDemoStepButton = ref(false);
        let messageId = 0;

        const diversionDemoFrames = [
            {
                role: 'assistant',
                content: '<div class="ai-reply-lead">您好，欢迎来到广州仲裁委员会，请问我能为您做什么？</div>'
            },
            {
                role: 'user',
                content: '我来广仲申请立案。'
            },
            {
                role: 'assistant',
                content: '<div class="ai-reply-lead">您来立案是否有管辖条款？请提供合同、订单或协议中约定仲裁机构的条款内容。</div>'
            },
            {
                role: 'user',
                content: '有的，在合同第十二条约定：因本合同产生的争议，提交广州仲裁委员会仲裁。'
            },
            {
                role: 'assistant',
                content: '<div class="ai-reply-lead">好的，已经核对条款中包含广州仲裁委员会约定。您的具体请求是什么？请先说第一项请求及金额。</div>'
            },
            {
                role: 'user',
                content: '我的第一项请求是要求对方退还培训服务费15800元。'
            },
            {
                role: 'assistant',
                content: '<div class="ai-reply-lead">对于第一项请求，您主张对方应当退款的事实依据和合同依据分别是什么？</div>'
            },
            {
                role: 'user',
                content: '事实依据是我已经支付15800元，但对方没有按约安排核心课程，多次申请退款未果。合同依据是合同约定课程服务内容和退款处理规则。'
            },
            {
                role: 'assistant',
                content: '<div class="ai-reply-lead">好的，已记录。除退款外，您是否还请求对方承担仲裁费、违约金、利息或其他费用？</div>'
            },
            {
                role: 'user',
                content: '第二项请求是要求对方承担本案仲裁费，暂不主张违约金和利息。'
            },
            {
                role: 'assistant',
                content: '<div class="ai-reply-lead">好的，已记录。请列出支撑上述请求的关键证据材料。</div>'
            },
            {
                role: 'user',
                content: '证据包括：培训服务合同、付款记录、课程宣传页、微信群延期通知、退款沟通记录、课程冻结申请和证据目录。'
            },
            {
                role: 'assistant',
                content: '<div class="ai-reply-lead">好的，已记录。下面给出本轮分流建议。</div>'
            }
        ];

        const escapeHtml = (text) => String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        const scrollToTop = () => {
            nextTick(() => {
                if (chatScroll.value) chatScroll.value.scrollTop = 0;
            });
        };

        const scrollToBottom = () => {
            nextTick(() => {
                if (chatScroll.value) chatScroll.value.scrollTop = chatScroll.value.scrollHeight;
            });
        };

        const buildAllDemoMessages = () => {
            messageId = 0;
            messages.value = diversionDemoFrames.map(frame => ({
                id: ++messageId,
                role: frame.role,
                content: frame.role === 'user' ? escapeHtml(frame.content) : frame.content,
                streaming: false
            }));
            resultReady.value = true;
            scrollToTop();
        };

        const suggestionPrompts = [
            {
                icon: 'fa-scale-balanced',
                label: '我该仲裁还是调解'
            },
            {
                icon: 'fa-circle-question',
                label: '我的证据够不够'
            },
            {
                icon: 'fa-file-signature',
                label: '我的请求是否合理'
            },
            {
                icon: 'fa-comment-dots',
                label: '对方会不会履行'
            }
        ];
        const formatFileSize = (size) => {
            if (!Number.isFinite(size)) return '';
            if (size < 1024) return `${size}B`;
            if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
            return `${(size / 1024 / 1024).toFixed(1)}MB`;
        };
        const triggerAttachmentUpload = () => {
            if (attachmentInput.value) attachmentInput.value.click();
        };
        const handleAttachmentChange = (event) => {
            const files = Array.from(event.target.files || []);
            if (!files.length) return;
            uploadedFiles.value.push(...files.map(file => ({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                name: file.name,
                size: file.size,
                raw: file
            })));
            event.target.value = '';
            scrollToBottom();
        };
        const removeAttachment = (id) => {
            uploadedFiles.value = uploadedFiles.value.filter(file => file.id !== id);
        };
        const syncDemoStepButtonConfig = (config = {}) => {
            const value = Object.prototype.hasOwnProperty.call(config, 'isShowDiversionDemoStepBtn')
                ? config.isShowDiversionDemoStepBtn
                : localStorage.getItem('isShowDiversionDemoStepBtn');
            showDemoStepButton.value = value === 1 || value === '1' || value === true;
        };

        const sendMessage = () => {};

        const playDemoNextStep = () => {
            scrollToBottom();
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

        syncDemoStepButtonConfig(window.FilingDemoConfig?.load?.());
        window.addEventListener('filing-demo-config-ready', event => syncDemoStepButtonConfig(event.detail || {}));
        window.addEventListener('filing-demo-config-change', event => syncDemoStepButtonConfig(event.detail || {}));

        buildAllDemoMessages();

        return {
            messages,
            inputText,
            aiIsThinking,
            resultReady,
            uploadedFiles,
            attachmentInput,
            confirmModal,
            chatScroll,
            showDemoStepButton,
            suggestionPrompts,
            formatFileSize,
            triggerAttachmentUpload,
            handleAttachmentChange,
            removeAttachment,
            sendMessage,
            playDemoNextStep,
            showConfirmModal,
            chooseArbitration,
            closeConfirmModal,
            executeConfirmAction
        };
    }
}).mount('#app');
