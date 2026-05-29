const { createApp, ref, computed, nextTick } = Vue;

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
        const stepIndex = ref(0);
        const showDemoStepButton = ref(false);
        const guideRoundCount = ref(0);
        const finishTooltipVisible = ref(false);
        const requiredGuideRounds = 3;
        let messageId = 0;
        let messageTypewriter = null;
        let finishTooltipTimer = null;

        const flowSteps = [
            {
                guide: '请说明您本次来广仲办理的事项。',
                placeholder: '请根据 AI 引导输入，例如：我来广仲申请立案',
                demo: '我来广仲申请立案。',
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
                demo: '我的第一项请求是要求对方退还培训服务费15800元。',
                reply: '对于第一项请求，您主张对方应当退款的事实依据和合同依据分别是什么？'
            },
            {
                guide: '请补充第一项请求对应的事实依据和合同依据。',
                placeholder: '请分别输入事实依据、合同依据，例如：事实依据是……合同依据是……',
                demo: '事实依据是我已经支付15800元，但对方没有按约安排核心课程，多次申请退款未果。合同依据是合同约定课程服务内容和退款处理规则。',
                reply: '好的，已记录。除退款外，您是否还请求对方承担仲裁费、违约金、利息或其他费用？'
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
                reply: '我已读取您提交的材料。请您确认一下：本案培训合同约定的课程是否包括“核心直播课、导师辅导、作业点评、就业或接单指导”等内容？'
            },
            {
                guide: '请确认合同约定的课程服务内容。',
                placeholder: '请说明合同或宣传页中约定的核心课程、辅导、点评等服务内容',
                demo: '是的，合同和课程宣传页里都有这些内容。销售人员也在微信里说过，核心课会由讲师直播授课，还有一对一辅导。',
                reply: '目前对方实际提供了哪些服务？是否已经开通账号、提供录播课、安排直播课或导师辅导？'
            },
            {
                guide: '请说明对方已经实际提供的服务。',
                placeholder: '请说明已开通账号、录播课、直播课、导师辅导等实际履行情况',
                demo: '对方只给我开通了学习账号，里面有两节导学录播课。我看过一部分，但核心直播课一直没有开，也没有安排导师辅导和作业点评。',
                reply: '请问核心课程未开课的情况，是否有明确的通知或沟通记录？例如延期通知、班主任说明、微信群公告等。'
            },
            {
                guide: '请补充核心课程未开课的沟通记录。',
                placeholder: '请说明是否有延期通知、班主任说明、微信群公告等',
                demo: '有。班主任在微信群里说过三次延期，理由是讲师档期调整。后来又说班级人数不够，要等下一期开班。',
                reply: '您第一次提出退款是什么时间？对方是如何回复的？'
            },
            {
                guide: '请补充首次退款时间和对方回复。',
                placeholder: '请说明首次申请退款时间、对方是否同意退款、是否提出扣费',
                demo: '我第一次是2025年11月21日申请退款。对方说可以继续等下一期开班，或者转到其他课程，但不接受全额退款。后来又说如果坚持退款，要扣30%的管理费。',
                reply: '根据您提交的合同，退款条款中确实提到“学员个人原因退费可扣除管理费”，但您现在主张的是对方未按约提供核心课程。因此，本案争议重点可能不是“您单方退课”，而是“培训机构是否构成未按约履行”。您是否认可这个争议焦点？'
            },
            {
                guide: '请确认是否认可当前争议焦点。',
                placeholder: '请说明您是否认可争议焦点是培训机构是否未按约履行',
                demo: '认可。我不是自己不想学了，是他们承诺的核心课一直不开，我才要求退款。',
                reply: '从证据角度看，您的付款金额、合同关系、仲裁条款比较清楚；但仍有两个需要注意的问题：第一，对方可能主张已经提供了部分录播服务；第二，对方可能主张延期不等于根本违约。您能否接受在退款金额上扣除少量已实际使用课程费用？'
            },
            {
                guide: '请说明是否接受扣除少量已实际使用课程费用。',
                placeholder: '请说明可接受的退款金额或调解底线',
                demo: '如果只是扣很少一部分，我可以考虑。但对方说要扣30%，我不能接受。我的底线大概是退14000元以上。',
                reply: '好的，已记录您的调解底线。结合目前材料，本案金额明确、事实相对集中，双方主要分歧在于退款金额和履行安排。如果直接进入仲裁，您需要继续准备证据目录、申请书、送达信息，并等待立案、组庭、审理和裁决；如果先行调解，可能更快解决退款金额和付款时间问题。您是否愿意先尝试调解，同时保留仲裁申请路径？'
            },
            {
                guide: '请确认是否愿意先尝试调解。',
                placeholder: '请说明是否愿意先调解，以及对调解周期的要求',
                demo: '可以先调解，但不能拖太久。如果对方还是不退，我还是要仲裁。',
                reply: '明白。建议您的调解方案可以设置为两档：第一档，要求对方退还15800元，并承担必要维权成本；第二档，为促成快速解决，可接受对方在5个工作日内一次性退还14500元，双方就本合同不再互相主张其他责任。您是否接受将14500元作为优先调解金额？'
            },
            {
                guide: '请确认优先调解金额。',
                placeholder: '请确认是否接受 14500 元作为优先调解金额',
                demo: '可以。只要对方5个工作日内退14500元，我可以接受调解结案。',
                reply: '好的，已记录。下面给出本轮智能分析建议。'
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

        const getMessageTypewriter = () => {
            if (!messageTypewriter) {
                messageTypewriter = window.createAiTypewriter({
                    messagesRef: messages,
                    thinkingRef: aiIsThinking,
                    replyDelay: 700,
                    fallbackText: '已记录。请继续补充下一项信息。',
                    nextId: () => ++messageId,
                    escapeHtml,
                    scrollToBottom
                });
            }
            return messageTypewriter;
        };

        const scheduleAssistantReply = (text, onComplete) => {
            getMessageTypewriter().scheduleReply(text, 700, {
                afterComplete: onComplete
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
        const currentPlaceholder = computed(() => '');
        const canFinishGuideConsult = computed(() => guideRoundCount.value >= requiredGuideRounds || resultReady.value);
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

        const sendMessage = () => {
            const text = inputText.value.trim();
            if (!text || aiIsThinking.value || resultReady.value) return;
            const step = currentStep.value;
            addUser(text);
            guideRoundCount.value += 1;
            inputText.value = '';
            aiIsThinking.value = true;
            scheduleAssistantReply(step.reply, () => {
                if (stepIndex.value >= flowSteps.length - 1) {
                    resultReady.value = true;
                } else {
                    stepIndex.value += 1;
                }
                scrollToBottom();
            });
        };

        const playDemoNextStep = () => {
            if (aiIsThinking.value || resultReady.value) return;
            inputText.value = currentStep.value.demo;
            sendMessage();
        };

        const showFinishTooltip = () => {
            finishTooltipVisible.value = true;
            if (finishTooltipTimer) window.clearTimeout(finishTooltipTimer);
            finishTooltipTimer = window.setTimeout(() => {
                finishTooltipVisible.value = false;
                finishTooltipTimer = null;
            }, 2200);
        };

        const stopCurrentReply = () => {
            if (messageTypewriter) messageTypewriter.clear();
            aiIsThinking.value = false;
        };

        const markGuideCompleted = () => {
            try {
                const completed = JSON.parse(localStorage.getItem('filingDemoCompletedPaths') || '{}');
                completed.diversion = true;
                localStorage.setItem('filingDemoCompletedPaths', JSON.stringify(completed));
            } catch (error) {
                localStorage.setItem('filingDemoCompletedPaths', JSON.stringify({ diversion: true }));
            }
        };

        const goToStep5 = () => {
            markGuideCompleted();
            window.location.href = './Step5CaseInfoConfirmation.html';
        };

        const finishGuideConsult = () => {
            if (!canFinishGuideConsult.value || aiIsThinking.value) {
                showFinishTooltip();
                return;
            }
            stopCurrentReply();
            goToStep5();
        };

        const goToStep5Direct = () => {
            stopCurrentReply();
            goToStep5();
        };

        const handleFinishButtonClick = (event) => {
            if (!canFinishGuideConsult.value || aiIsThinking.value) {
                event?.preventDefault?.();
                showFinishTooltip();
                return;
            }
            finishGuideConsult();
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

        addAssistant('<div class="ai-reply-lead">您好，欢迎来到广州仲裁委员会，请问我能为您做什么？</div>');

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
            guideRoundCount,
            canFinishGuideConsult,
            finishTooltipVisible,
            currentGuide,
            currentPlaceholder,
            formatFileSize,
            triggerAttachmentUpload,
            handleAttachmentChange,
            removeAttachment,
            sendMessage,
            playDemoNextStep,
            finishGuideConsult,
            goToStep5Direct,
            handleFinishButtonClick,
            showConfirmModal,
            chooseArbitration,
            closeConfirmModal,
            executeConfirmAction
        };
    }
}).mount('#app');
