const { createApp, ref, computed, onMounted, nextTick } = Vue;

    createApp({
        setup() {
            // Assets
            const npcImage = ref('./图片/引导角色1.png');
            const mapImage = ref('./图片/智能服务大厅背景.png');

            // Game State
            const stage = ref('ai_consult'); // demo starts directly at AI consultation
            const subStage = ref(0);
            const showDialog = ref(false);
            const waitingForInteraction = ref(false); // If true, dialog click won't advance, must interact with panel
            const finalDest = ref('调解');
            const applyChannel = ref('调解'); // '调解' or '仲裁'

            // Visual Effects State
            const showCaseTypeBadge = ref(false);
            const scorePopups = ref([]);
            let popupId = 0;

            // --- New Gamification State ---
            const score = ref(0);
            const scoreAnimate = ref(false);
            const isBadgeDrawerOpen = ref(false);
            const newBadgeCount = ref(0);
            const currentMilestone = ref(null);
            const flyingScores = ref([]);
            const scoreDisplay = ref(null); // Ref for DOM element
            const taskCenterStorageKey = 'reward-task-status-v1';
            const filingStorageKey = 'reward-filing-status-v1';
            const startBadgeToastShown = ref(false);
            const sessionBadgeToastsShown = ref([]);
            const badges = ref([
                { id: 'start', name: '立案启程', desc: '正式开启立案申请流程', icon: '初' },
                { id: 'fast', name: '高效填报', desc: '流畅准确完成信息核对', icon: '速' },
                { id: 'half', name: '进展顺利', desc: '完成过半申请步骤', icon: '半' },
                { id: 'master', name: '准备就绪', desc: '完成所有必填项梳理', icon: '成' }
            ]);
            const badgeMilestoneText = {
                start: '获得勋章：立案启程',
                fast: '获得勋章：高效填报',
                half: '获得勋章：进展顺利',
                master: '获得勋章：准备就绪'
            };
            const earnedBadges = ref([]);
            const filingStatus = ref({
                answeredQuestions: [],
                earnedBadges: []
            });
            const isFilingCompleted = ref(false);
            const selectedReportPath = ref('');
            const filingProgressSteps = [
                '资料提交',
                '答题关卡',
                '案件评估报告',
                '后续路径'
            ];

            // New Data for Analysis & Upload
            const analysisData = ref({
                caseType: '教育培训合同纠纷',
                amount: '15,800.00 元',
                applicantType: '自然人',
                respondentType: '企业',
                requests: [
                    { amount: '15,800.00 元', content: '请求被申请人退还教育培训服务费 15,800.00 元。' },
                    { amount: '以实际发生为准', content: '请求被申请人承担本案仲裁费、保全费等因维权产生的合理费用。' }
                ]
            });
            const filingMeta = ref({
                caseNo: '2026012150',
                submitTime: '2026-03-20 10:08',
                status: '审核中'
            });
            // Removed analysisDataLabels as we use custom template now
            
            // Dialog System
            const currentDialogFull = ref("");
            const displayedText = ref("");
            const isTyping = ref(false);
            const pendingWaitInteraction = ref(false);
            const typeSpeed = 40;
            let typeInterval = null;

            // Map Data (From Reference)
            const mapPoints = [
                { x: 150, y: 200, label: '案情收集' },
                { x: 650, y: 200, label: '智能分析' }
            ];

            // Q&A Data (From Reference)
            const currentQuestionIndex = ref(0);
            const aiInput = ref('');
            const aiIsThinking = ref(false);
            const aiChatBody = ref(null);
            const aiFileInput = ref(null);
            const aiAttachmentName = ref('');
            const aiOcrStatus = ref('idle');
            let aiOcrTimer = null;
            const aiReplyDelay = 3000;
            let aiMessageId = 0;
            const aiMessages = ref([]);
            let aiTypewriter = null;
            const aiDefenseRoundCount = ref(0);
            const selectedAiPresetCard = ref(null);
            const hasSelectedAiPreset = computed(() => Boolean(selectedAiPresetCard.value));
            const aiFinishTooltipVisible = ref(false);
            const AI_DEFENSE_REQUIRED_ROUNDS = 3;
            const canFinishAiConsult = computed(() => aiDefenseRoundCount.value >= AI_DEFENSE_REQUIRED_ROUNDS);
            const aiInputPlaceholder = computed(() => {
                return '';
            });
            const aiOcrStatusText = computed(() => {
                if (aiOcrStatus.value === 'processing') return '材料识别中';
                if (aiOcrStatus.value === 'success') return '材料识别完成';
                if (aiOcrStatus.value === 'error') return '材料识别失败';
                return '';
            });
            const aiPresetCards = ref([
                {
                    id: 'D1',
                    title: '权利依据不清',
                    desc: '主张缺少明确权利来源。',
                    tag: '依据争议',
                    icon: 'fas fa-file-contract',
                    openingMessage: '我方不认可你方对权利来源和责任依据的概括。你方现在主张我方承担责任，具体依据是哪一份协议、合同、订单、结算文件或确认记录？',
                    keyQuestions: [
                        '你方主张权利的具体依据是什么？',
                        '该依据是否明确指向我方应承担的责任？',
                        '双方是否对交易内容、履行标准或结算结果作过确认？'
                    ]
                },
                {
                    id: 'D2',
                    title: '我方已经履行',
                    desc: '不认可完全未履行说法。',
                    tag: '履行争议',
                    icon: 'fas fa-chart-line',
                    openingMessage: '我方不认可你方关于我方完全未履行的说法。即使双方存在争议，也不代表我方没有履行。你方具体认为我方哪一项义务没有完成？',
                    keyQuestions: [
                        '你方认为我方具体哪一项义务没有完成？',
                        '该义务在协议、交易文件或沟通记录中如何约定？',
                        '你方是否能区分已履行部分和争议部分？'
                    ]
                },
                {
                    id: 'D3',
                    title: '申请人也有责任',
                    desc: '争议并非单方造成。',
                    tag: '责任争议',
                    icon: 'fas fa-scroll',
                    openingMessage: '我方不认可你方把责任全部归到我方。争议形成并不一定是单方原因，如果你方也存在未配合、未确认、迟延反馈或自行扩大损失的情况，责任不能全部由我方承担。你方是否已经完成自己的配合义务？',
                    keyQuestions: [
                        '你方是否已经完成付款、确认、验收、资料提供或其他配合义务？',
                        '争议发生前，我方是否要求你方配合、确认或补充材料？',
                        '你方是否存在迟延反馈、拒绝配合、未及时确认或扩大损失的情况？'
                    ]
                },
                {
                    id: 'D4',
                    title: '证据无法证明责任',
                    desc: '现有材料支撑不足。',
                    tag: '证据争议',
                    icon: 'fas fa-folder-open',
                    openingMessage: '我方不认可你方关于我方应承担责任的说法。你方目前更多是在陈述自己的理解，但需要有材料对应具体责任事实。你方具体依据哪份材料认定我方应承担责任？',
                    keyQuestions: [
                        '哪份材料能直接证明我方应承担该项责任？',
                        '该材料是否能对应具体协议、交易事实、履行记录或结算结果？',
                        '现有材料能否证明损失、金额或付款义务与我方行为之间存在关联？'
                    ]
                },
                {
                    id: 'D5',
                    title: '金额计算缺少依据',
                    desc: '请求金额缺少拆分说明。',
                    tag: '金额争议',
                    icon: 'fas fa-handshake',
                    openingMessage: '我方不认可你方主张的金额。你方不能只给出一个总数，就要求我方全部承担。请你方先说明每一项金额分别是什么、如何计算、依据是什么？',
                    keyQuestions: [
                        '本金、价款、费用、利息、违约金、损失或返还款是否已经分别拆分？',
                        '每一项金额对应的协议依据、事实依据或计算依据是什么？',
                        '是否存在重复计算或扩大计算？',
                    ]
                },
                {
                    id: 'D6',
                    title: '只认可部分责任',
                    desc: '可沟通但不接受全部请求。',
                    tag: '协商争议',
                    icon: 'fas fa-receipt',
                    openingMessage: '我方并不是完全拒绝沟通，但不接受你方没有区分事实和金额就要求我方承担全部责任。你方能否先说明，哪些请求是有明确协议依据、事实依据和证据依据的？',
                    keyQuestions: [
                        '你方哪些请求有明确协议依据、事实依据和证据依据？',
                        '哪些金额属于你方主张，哪些金额可以客观核算？',
                        '如果只能证明部分事实，你方是否接受在对应范围内沟通处理？'
                    ]
                }
            ]);

            const questions = [
                {
                    id: 1,
                    text: "您主张双方存在教育培训关系，请问双方是否形成了相应的合同或合作文件？",
                    options: [
                        "已签订培训服务协议（含电子合同），并能看出课程内容、课时数、授课方式、费用及退款条款等主要约定。",
                        "虽无正式合同，但有报名单、缴费确认或微信确认，能反映主要培训约定。",
                        "没有书面或电子合同，仅凭缴费记录，未签订任何培训协议。"
                    ]
                },
                {
                    id: 2,
                    text: "双方对教育培训的关键条款是否约定清楚？",
                    options: [
                        "已明确约定课程名称及课时数、授课方式（线下/直播/录播）和师资标准、退款条件及比例、是否含“保过/不过退费”等保障条款及其具体触发条件。",
                        "约定了部分内容，但退款触发条件、师资资质标准或“保过”条款的具体认定条件仍有不清晰之处。",
                        "未约定退款条件，或明确约定“一经报名概不退款”，也未承诺任何服务保障条款。"
                    ]
                },
                {
                    id: 3,
                    text: "合同签订后，课程/培训是否实际开课？",
                    options: [
                        "课程已实际开课，学员已实际参加了课时或线上/线下学习，有出勤记录、课程材料或课时记录可查。",
                        "已开课但中途中断，或部分课时已完成，但剩余课程未按约安排或无法正常上课。",
                        "合同签订后课程从未实际开课，学员从未参加任何课时或培训活动。"
                    ]
                },
                {
                    id: 4,
                    text: "您主张对方构成违约，具体违约事实是什么？",
                    options: [
                        "违约事实明确：课程未按约提供（课时严重缩水/师资被替换/直播长期无法观看），“保过”承诺退款被拒，或虚假宣传导致报名，有课程记录、承诺截图等证据。",
                        "存在一定争议，如课时完成度认定或退款计算标准有分歧，但是否构成违约仍需结合合同约定判断。",
                        "无法明确指出对方违反了哪项具体约定，主要是对培训效果或考试结果不满意。"
                    ]
                },
                {
                    id: 5,
                    text: "关于您主张的退款金额，是否有清晰的计算依据和证据支撑？",
                    options: [
                        "能提供培训合同、缴费记录、上课/出勤记录、退款申请沟通及承诺截图，并能说明已消耗课时费和应退金额的计算依据。",
                        "有部分缴费记录或上课记录，但已消耗课时数、退款比例计算或“保过”触发条件仍存在争议。",
                        "缺少上课记录或合同约定，退款金额主要来自单方主张，难以核实应退金额。"
                    ]
                }
            ];

            const currentMapNodeIndex = computed(() => {
                if (['ai_consult', 'report', 'enter_apply', 'success'].includes(stage.value)) {
                    return 1; // 智能分析
                }
                return 0; // 案情收集
            });

            const pathLength = 500; 
            const pathOffset = computed(() => {
                const total = mapPoints.length;
                return pathLength - (pathLength / (total - 1) * Math.min(currentMapNodeIndex.value, total - 1));
            });

            const currentQuestion = computed(() => {
                if (!questions || questions.length === 0) return { text: "", options: [] };
                return questions[currentQuestionIndex.value] || questions[0];
            });

            const showOverlayPanel = computed(() => {
                // Keep panel visible for QA and Report stages regardless of interaction state to prevent flickering
                if (['qa', 'ai_consult', 'report', 'loading_report'].includes(stage.value)) return true;
                
                return ['parsing', 'enter_apply', 'success', 'analysis_result'].includes(stage.value) && waitingForInteraction.value;
            });

            // --- Methods ---

            const speak = (text, waitInteraction = false) => {
                currentDialogFull.value = text;
                displayedText.value = "";
                isTyping.value = true;
                showDialog.value = true;
                waitingForInteraction.value = false; // Reset first
                pendingWaitInteraction.value = waitInteraction;

                clearInterval(typeInterval);
                let i = 0;
                typeInterval = setInterval(() => {
                    if (i < text.length) {
                        // Handle HTML tags to prevent typing them char by char
                        if (text[i] === '<') {
                            const closeIdx = text.indexOf('>', i);
                            if (closeIdx !== -1) {
                                displayedText.value += text.substring(i, closeIdx + 1);
                                i = closeIdx + 1;
                                return;
                            }
                        }
                        displayedText.value += text.charAt(i);
                        i++;
                    } else {
                        finishTyping();
                    }
                }, typeSpeed);
            };

            const finishTyping = () => {
                clearInterval(typeInterval);
                isTyping.value = false;
                displayedText.value = currentDialogFull.value;
                if (pendingWaitInteraction.value) {
                    waitingForInteraction.value = true;
                }
            };

            const handleDialogClick = () => {
                if (isTyping.value) {
                    finishTyping(); // Skip typing
                } else if (stage.value === 'success' && finalDest.value === '撤回') {
                    returnToDraftList();
                } else if (stage.value === 'analysis_result' && waitingForInteraction.value) {
                    confirmAnalysis();
                } else if (waitingForInteraction.value) {
                    return; // Block clicks if user needs to use the panel
                } else {
                    nextGameStep(); // Go to next logic step
                }
            };

            // --- Game Logic Flow Control ---
            
            const nextGameStep = () => {
                // Main State Machine
                switch (stage.value) {
                    case 'intro':
                        startParsing();
                        break;
                    
                    case 'parsing_done':
                         if (subStage.value === 0) {
                             speak("我已为您整理出案件类型、标的金额、全部请求和当事人类型，后续问答会基于这些信息继续进行。");
                             subStage.value++;
                         } else {
                             speak("为了更加全面、客观的分析案情，出具更加中立、科学的评估报告，接下来，请您动动小手指，根据案件实际情况选择最接近的一项");
                             stage.value = 'pre_qa';
                             subStage.value = 0;
                         }
                         break;

                    case 'pre_qa':
                        stage.value = 'qa';
                        speak("请根据实际情况回答屏幕上方的问题。", true);
                        break;

                    case 'qa_done':
                        stage.value = 'report';
                        speak("恭喜您完成所有关卡！这是为您生成的案件评估报告，请查阅。", true);
                        break;
                }
            };

            const showBadgeMilestone = (badge) => {
                currentMilestone.value = badgeMilestoneText[badge.id] || `获得勋章：${badge.name}`;
                setTimeout(() => {
                    if (currentMilestone.value === (badgeMilestoneText[badge.id] || `获得勋章：${badge.name}`)) {
                        currentMilestone.value = null;
                    }
                }, 3000);
            };

            const maybeShowStartBadgeToast = () => {
                if (startBadgeToastShown.value) return;
                startBadgeToastShown.value = true;
                unlockBadge('start', { forceToast: true });
            };

            const startParsing = () => {
                stage.value = 'parsing';
                window.setTimeout(() => {
                    maybeShowStartBadgeToast();
                }, 240);
                speak("AI 正在为您扫描并解析案件关键要素...", true);
                
                // Simulate AI Parsing Delay
                setTimeout(() => {
                    waitingForInteraction.value = false; // Enable click to continue
                    showCaseTypeBadge.value = true;
                    stage.value = 'pre_qa';
                    speak("为了更加全面、客观的分析案情，出具更加中立、科学的评估报告，接下来，请您动动小手指，根据案件实际情况选择最接近的一项");
                }, 3000);
            };

            const showScore = (text, event) => {
                // Keep legacy text popup
                let x = window.innerWidth / 2;
                let y = window.innerHeight / 2;
                
                if (event && event.clientX) {
                    x = event.clientX;
                    y = event.clientY;
                }

                const id = popupId++;
                scorePopups.value.push({ id, text, x, y });
                
                setTimeout(() => {
                    scorePopups.value = scorePopups.value.filter(p => p.id !== id);
                }, 1500);
            };

            // --- New Gamification Methods ---
            
            const addScore = (amount, event) => {
                score.value += amount;

                // Animate HUD
                scoreAnimate.value = true;
                setTimeout(() => scoreAnimate.value = false, 150);

                // 3. Flying Animation
                if (event && event.clientX) {
                    const id = Date.now() + Math.random();
                    // Start position: Click
                    // End position: HUD Score (Approx top-right)
                    // Since we can't easily get HUD rect in Vue setup without ref measurement, we approximate or use fixed
                    // Let's target the score area (e.g., top-rightish)
                    const targetX = window.innerWidth - 150; 
                    const targetY = 30;

                    const fly = {
                        id,
                        text: `+${amount}积分`,
                        x: event.clientX,
                        y: event.clientY,
                        opacity: 1,
                        scale: 1
                    };
                    flyingScores.value.push(fly);

                    // Animate
                    requestAnimationFrame(() => {
                        fly.x = targetX;
                        fly.y = targetY;
                        fly.scale = 0.5;
                        fly.opacity = 0; // Fade out as it reaches
                    });

                    setTimeout(() => {
                        flyingScores.value = flyingScores.value.filter(f => f.id !== id);
                    }, 800);
                }
            };

            const readTaskStatus = () => {
                try {
                    return JSON.parse(window.localStorage.getItem(taskCenterStorageKey) || '{}');
                } catch (error) {
                    return {};
                }
            };

            const getTaskCenterPointsTotal = () => {
                const taskStatus = readTaskStatus();
                return Object.values(taskStatus).reduce((sum, item) => {
                    if (!item || !item.completed) {
                        return sum;
                    }
                    return sum + Number(item.reward || 0);
                }, 0);
            };

            const readFilingStatus = () => {
                try {
                    return JSON.parse(window.localStorage.getItem(filingStorageKey) || '{}');
                } catch (error) {
                    return {};
                }
            };

            const writeFilingStatus = (status) => {
                window.localStorage.setItem(filingStorageKey, JSON.stringify(status));
            };

            const getFilingPointsTotal = (status) => {
                const answeredQuestions = Array.isArray(status.answeredQuestions) ? status.answeredQuestions.length : 0;
                return answeredQuestions * 2;
            };

            const syncScoreFromStorage = () => {
                score.value = getTaskCenterPointsTotal() + getFilingPointsTotal(filingStatus.value);
            };

            const deriveEarnedBadgeIds = (status) => {
                const answeredCount = Array.isArray(status.answeredQuestions) ? status.answeredQuestions.length : 0;
                const derived = ['start'];
                if (answeredCount >= 2) derived.push('fast');
                if (answeredCount >= 3) derived.push('half');
                if (answeredCount >= questions.length) derived.push('master');
                return derived;
            };

            const unlockBadge = (id, options = {}) => {
                const badge = badges.value.find(b => b.id === id);
                if (!badge) return;
                const alreadyEarned = earnedBadges.value.includes(id);
                const toastShownThisSession = sessionBadgeToastsShown.value.includes(id);
                if (!alreadyEarned) {
                    earnedBadges.value.push(id);
                    newBadgeCount.value++;
                    filingStatus.value.earnedBadges = [...earnedBadges.value];
                    writeFilingStatus(filingStatus.value);
                }
                if ((!alreadyEarned || options.forceToast) && !toastShownThisSession) {
                    sessionBadgeToastsShown.value.push(id);
                    showBadgeMilestone(badge);
                    showScore(badge.icon, null);
                }
            };

            const reportStep = ref(1);

            const filingStatusTitle = computed(() => {
                if (isFilingCompleted.value) {
                    return '立案已完成';
                }
                return '立案最后一步';
            });

            const filingStatusDesc = computed(() => {
                if (isFilingCompleted.value) {
                    const pathLabelMap = {
                        withdraw: '撤回案件',
                        mediation: '调解路径',
                        arbitration: '联系客服，进行仲裁'
                    };
                    return `已选择后续处理方式：${pathLabelMap[selectedReportPath.value] || '已完成'}`;
                }
                return '请先选择下方处理方式，确认后本次立案流程即完成。';
            });
            
            // Add currentReportType and two report data objects
            const currentReportType = ref('default');
            
            const reportDataDefault = {
                risk_level: "较高风险",
                risk_overview: "你方手握合同、付款凭证且对方确在清算，看似优势明显，似乎已立于不败之地。然而，你方核心的违约指控（服务不专业、无效果）缺乏有力证据支撑，对方可凭借对己方有利的合同条款轻松抗辩，而公司清算更将导致漫长、高成本的执行难题。胜算有，但赢的代价可能远超预期。",
                success_probability_max: "55",
                success_probability_min: "35",
                favorable_factors: [
                    {
                        title: "合同关系与支付事实清晰",
                        description: "你方与幸福有爱公司签署了两份协议，并有银行流水清晰显示向“婚恋无忧”账户支付总计105,800元，这构成了主张权利最坚实的基础。对方难以否认收到款项这一客观事实。"
                    },
                    {
                        title: "对方存在履约瑕疵及清算行为",
                        description: "聊天记录显示，对方老师在服务后期沟通中确实存在拖延、敷衍的情况，未能就你的退款诉求给出实质性解决方案。且被申请人公司已进入清算程序，从商业常理看，这构成了其可能无法继续履约的初步迹象。"
                    }
                ],
                unfavorable_factors: [
                    {
                        title: "核心违约主张证据链断裂",
                        description: "你方主张对方服务不专业、无效果，但现有聊天记录仅能证明对方提供了持续性沟通，内容多为“劝坚持”，不足以直接证明其服务构成欺诈或根本违约。缺乏对方明确承认服务无效、或第三方对服务质量的专业否定性评价，这一主张在仲裁庭上极易被对方否认。"
                    },
                    {
                        title: "合同条款对你方维权构成多重限制",
                        description: "协议第十二条特别约定将“关系不管因何种原因修复”均视为服务有效，这几乎排除了以“未达到效果”为由退款的可能。另一协议第五条更规定异议期仅为三个月，过期视为认可服务。而违约责任条款主要约束你方，你方主张的30%违约金在合同中缺乏对等的明确依据。"
                    },
                    {
                        title: "法律认定门槛高且执行前景黯淡",
                        description: "主张“根本违约”以返还全部费用，在法律上需证明对方行为已致合同目的完全无法实现，仅凭清算行为和服务效果的主观感受，仲裁庭支持难度较大。更现实的是，对方主体正在清算，即便胜诉，追索财产也将面临极大障碍，可能陷入“赢了官司输了钱”的困境。"
                    }
                ]
            };

            const reportDataNew = {
                risk_level: "较高风险",
                risk_overview: "你方手握合同与付款凭证，维权诉求在情理之中。但合同条款暗藏诸多对你方不利的“坑”，特别是业绩核算与反馈机制的设计，使你方在证明对方根本违约时面临极高的举证门槛和法律认定困难，维权之路将充满不确定性。",
                success_probability_max: "50",
                success_probability_min: "30",
                favorable_factors: [
                    {
                        title: "一、基础法律关系明确，核心诉求存在事实依据",
                        description: "合同与付款凭证齐全，证明了25万元服务费已支付。对方未支付约定的美容师补贴、未能协助达成380万元业绩，这些核心违约事实是启动维权的坚实基础。你方的委屈和诉求是有现实依据的。"
                    }
                ],
                unfavorable_factors: [
                    {
                        title: "一、业绩承诺落空的举证难度极大",
                        description: "主张业绩未达标，但协议明确约定业绩核算以乙方提供的报表为准，且需你方每月主动交付。你方很可能无法提供经对方确认的、完整的业绩报表，或被对方以你方未按时提供报表为由，主张视为其已完成承诺。"
                    },
                    {
                        title: "二、主张服务未履行的证据链不完整",
                        description: "协议附件规定，三次上门服务后进入“反馈服务阶段”，需由你方提出具体意见。对方律师会咬住此点，主张你方从未提出有效反馈需求，或你方存在不配合行为。你方难以证明已穷尽一切方式要求其提供有效服务。"
                    },
                    {
                        title: "三、合同限制性条款将成为对方有力盾牌",
                        description: "协议第九条规定，若你方不配合、不按时提供业绩报表，则视为乙方已履行义务。对方完全可以主张是你方不提供数据导致无法核算业绩，是你方不主动反馈导致服务无法推进。这些条款将成为你方维权的巨大障碍。"
                    },
                    {
                        title: "四、法律上“根本违约”认定门槛高",
                        description: "司法实践中，要论证对方未履行业绩承诺就导致合同目的无法实现，从而支持解除合同、全额退款，门槛极高。合同目的并非仅此一项，对方会主张其提供了线上服务、品项梳理等，你方单以未达业绩目标为由解除合同，难获支持。"
                    }
                ]
            };

            const reportDataThird = {
                risk_level: "较高风险",
                risk_overview: "你方手握合同和付款凭证，维权基础事实清晰，诉求具有正当性。然而，合同的关键条款、举证责任分配及业绩目标的证明方式均对你方极为不利，核心主张缺乏直接证据，法律认定门槛高。即便部分诉求被支持，也难以实现全额退款的仲裁目标，维权过程将异常艰辛。",
                success_probability_max: "50",
                success_probability_min: "30",
                favorable_factors: [
                    {
                        title: "1、合同与付款事实清晰",
                        description: "合同签订与25万元全额付款的事实确凿，证据链清晰。这为你方主张对方违约、要求其承担相应责任奠定了无可争议的事实基础。"
                    },
                    {
                        title: "2、被申请人存在违约表象",
                        description: "你方主张被申请人未支付前五个月每月1万元的补贴，此项若有聊天记录等证据支持，对方将难以自圆其说，属于对我方有利的切入点。"
                    }
                ],
                unfavorable_factors: [
                    {
                        title: "1、核心业绩违约举证艰难",
                        description: "协议第七条第4款约定，业绩核算以乙方提供的报表为准，且需你方每月主动提交。若你方无法证明已按期提交真实报表，或无法提供经对方确认的未达标证据，该业绩承诺条款几乎无法对你方产生约束力。"
                    },
                    {
                        title: "2、合同解除与退款障碍巨大",
                        description: "对方可依据协议第七条第5款抗辩，主张业绩下滑或纠纷是你方自身经营原因导致，从而拒绝退款。即便仲裁庭认定其违约，依据第七条第3款，退款也需在扣除其服务成本后按比例计算，你方主张全额退款的法律和合同依据严重不足。"
                    },
                    {
                        title: "3、服务履行的证明困境",
                        description: "你方主张对方未提供有效服务，但协议附件中列有大量线上服务与三次上门服务。对方仅需举证提供了部分表格、方案或进行了线上沟通，即可主张已履行主要义务。你方难以证明其服务完全未提供或根本无效。"
                    }
                ]
            };

            const currentReportData = computed(() => {
                if (currentReportType.value === 'default') return reportDataDefault;
                if (currentReportType.value === 'new') return reportDataNew;
                return reportDataThird;
            });

            const isProgressStepDone = (index) => index <= 2;
            const getProgressStepClass = (index) => {
                if (index <= 2) return 'done';
                return 'active';
            };

            const nextReportStep = () => {
                reportStep.value = 2;
                speak('广州仲裁委员会秉持“为每一起纠纷提供最佳解决方案”的目标愿景，在您排队等待仲裁立案的过程中，我们向您提供了一个更为快速、便捷、低成本的解决方式：调解，让您足不出户，一键解纷。', true);
            };

            const prevReportStep = () => {
                reportStep.value = 1;
            };

            const markFilingCompleted = (path) => {
                selectedReportPath.value = path;
                isFilingCompleted.value = true;
            };

            const toggleBadgeDrawer = () => {
                isBadgeDrawerOpen.value = !isBadgeDrawerOpen.value;
                if (isBadgeDrawerOpen.value) {
                    newBadgeCount.value = 0;
                }
            };

            const checkMilestones = () => {
                const total = questions.length;
                // Toast 按当前这次闯关流程触发，不受 localStorage 历史状态干扰。
                const answeredCount = currentQuestionIndex.value + 1;

                if (answeredCount === 2) unlockBadge('fast', { forceToast: true });
                if (answeredCount === 3) unlockBadge('half', { forceToast: true });
                if (answeredCount === total) unlockBadge('master', { forceToast: true });
            };

            const confirmAnalysis = () => {
                waitingForInteraction.value = false;
                stage.value = 'parsing_done';
                subStage.value = 0;
                showCaseTypeBadge.value = true; // Enable persistent badge
                handleDialogClick();
            };

            // Context-Aware Dialogues
            const npcComments = {
                1: "好的，已收到您的选择。",
                2: "明白，相关信息已记录。",
                3: "好的，请继续下一题。",
                4: "收到，感谢您的配合。",
                5: "好的，信息已确认。"
            };

            // Step 3: Q&A
            const prevQuestion = () => {
                if (currentQuestionIndex.value > 0) {
                    currentQuestionIndex.value--;
                    speak("好的，让我们重新确认上一题。", true);
                }
            };

            // --- Video Modal Logic ---
            const showVideoModal = ref(false);
            const videoSrc = ref('');
            const videoBasePath = './视频/';
            const videoSpeed = ref(1.0);
            const videoPlayer = ref(null);
            const pendingNextQuestion = ref(false);

            // Confirm Modal Logic
            const confirmModal = ref({
                show: false,
                type: '', // 'mediation' or 'withdraw'
                title: '',
                message: ''
            });

            const showConfirmModal = (type) => {
                confirmModal.value.type = type;
                if (type === 'mediation') {
                    confirmModal.value.title = '确认进入调解？';
                    confirmModal.value.message = '您的案件将进入快速调解通道，三个工作日内会有调解员与您联系。';
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

            const executeConfirmAction = () => {
                const type = confirmModal.value.type;
                if (type === 'arbitration') {
                    closeConfirmModal();
                    contactService();
                } else if (type === 'withdraw') {
                    if (!isFilingCompleted.value) {
                        markFilingCompleted('withdraw');
                    }
                    confirmModal.value.type = 'withdrawDone';
                    confirmModal.value.title = '已撤回案件';
                    confirmModal.value.message = '已为您撤回案件，可返回“草稿”查看。';
                } else {
                    closeConfirmModal();
                    choosePath(type);
                }
            };

            const setVideoSpeed = (speed) => {
                videoSpeed.value = speed;
                if (videoPlayer.value) {
                    videoPlayer.value.playbackRate = speed;
                }
            };

            const openPointsPage = () => {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'navigate-demo-page', key: 'points' }, '*');
                    return;
                }
                window.location.href = './积分任务中心.html';
            };

            const awardCurrentQuestionPoints = (event) => {
                const questionId = currentQuestion.value.id;
                let delta = 0;
                const nextStatus = {
                    answeredQuestions: Array.isArray(filingStatus.value.answeredQuestions) ? [...filingStatus.value.answeredQuestions] : [],
                    earnedBadges: Array.isArray(filingStatus.value.earnedBadges) ? [...filingStatus.value.earnedBadges] : []
                };

                if (!nextStatus.answeredQuestions.includes(questionId)) {
                    nextStatus.answeredQuestions.push(questionId);
                    delta += 2;
                }

                filingStatus.value = nextStatus;
                writeFilingStatus(nextStatus);

                if (delta > 0) {
                    addScore(delta, event);
                }
            };

            const closeVideo = () => {
                showVideoModal.value = false;
                videoSpeed.value = 1.0;
                if (videoPlayer.value) {
                    videoPlayer.value.pause();
                    videoPlayer.value.currentTime = 0;
                }
                if (pendingNextQuestion.value) {
                    pendingNextQuestion.value = false;
                    advanceQuestionLogic();
                }
            };

            const escapeHtml = (text) => {
                return String(text)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            };

            const scrollAiChatToBottom = () => {
                nextTick(() => {
                    if (aiChatBody.value) {
                        aiChatBody.value.scrollTop = aiChatBody.value.scrollHeight;
                    }
                });
            };

            const scrollAiChatToTop = () => {
                nextTick(() => {
                    if (aiChatBody.value) {
                        aiChatBody.value.scrollTop = 0;
                    }
                });
            };

            const getAiTypewriter = () => {
                if (!aiTypewriter) {
                    aiTypewriter = window.createAiTypewriter({
                        messagesRef: aiMessages,
                        thinkingRef: aiIsThinking,
                        replyDelay: aiReplyDelay,
                        fallbackText: '我方不认可你方没有依据的概括主张。请先说明合同依据、事实依据、证据依据和金额计算依据。',
                        nextId: () => ++aiMessageId,
                        escapeHtml,
                        scrollToBottom: scrollAiChatToBottom
                    });
                }
                return aiTypewriter;
            };
            const mediationEntryHtml = '';
            const shouldShowMediationEntry = () => (
                stage.value === 'ai_consult' && aiDefenseRoundCount.value >= AI_DEFENSE_REQUIRED_ROUNDS
            );
            const getMediationAfterCompleteHtml = () => (shouldShowMediationEntry() ? mediationEntryHtml : '');
            const clearAiReplyTimer = () => getAiTypewriter().clearReplyTimer();
            const clearAiStreamTimer = () => getAiTypewriter().clearStreamTimer();

            const pushAiChatAssistantMessage = (text, { showMediation = false } = {}) => {
                let content = escapeHtml(text);
                if (showMediation) {
                    content += mediationEntryHtml;
                }
                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'assistant',
                    content,
                    streaming: false
                });
                scrollAiChatToBottom();
            };

            const showAiFinishTooltip = () => {
                if (canFinishAiConsult.value) return;
                aiFinishTooltipVisible.value = true;
            };

            const hideAiFinishTooltip = () => {
                aiFinishTooltipVisible.value = false;
            };

            const clearAiOcrTimer = () => {
                if (!aiOcrTimer) return;
                clearTimeout(aiOcrTimer);
                aiOcrTimer = null;
            };

            const resetAiAttachment = () => {
                clearAiOcrTimer();
                aiAttachmentName.value = '';
                aiOcrStatus.value = 'idle';
            };

            const syncAiPresetState = (card) => {
                selectedAiPresetCard.value = card ? {
                    id: card.id,
                    title: card.title,
                    tag: card.tag,
                    desc: card.desc,
                    openingMessage: card.openingMessage,
                    keyQuestions: Array.isArray(card.keyQuestions) ? [...card.keyQuestions] : []
                } : null;
            };

            const reopenAiPresetCards = () => {
                if (aiIsThinking.value) return;
                selectedAiPresetCard.value = null;
                aiMessages.value = [];
                aiMessageId = 0;
                aiDefenseRoundCount.value = 0;
                aiInput.value = '';
                resetAiAttachment();
                clearAiReplyTimer();
                clearAiStreamTimer();
                setAiStaticGreeting();
            };

            const buildDefenseReply = (card, question) => {
                const normalized = String(question || '').replace(/\s/g, '');
                if (/伪造|补做证据|修改聊天记录|补签协议|删除不利|做假|造假/.test(normalized)) {
                    return '我方不接受围绕虚假材料继续沟通。你方如果要主张责任，只能回到现有真实材料、合同条款和已发生的履行记录上。你方现有证据具体是哪一份？';
                }
                if (/胜诉概率|败诉概率|会不会支持|支持我吗|仲裁庭会|仲裁委会|结果一定|一定赢|一定输/.test(normalized)) {
                    return '我方不能替仲裁机构预测处理结果，也不会用结果判断替代事实争议。你方如果坚持主张，请先说明权利依据、证据对应关系和金额计算依据。';
                }
                if (/代表广州仲裁委员会|代表仲裁庭|代表仲裁员|真实被申请人|作出承诺|官方表态/.test(normalized)) {
                    return '我方不能代表仲裁机构、仲裁庭或真实当事人作出承诺。当前只围绕你方主张回应，请先说明你方请求对应的权利依据。';
                }
                const fallback = {
                    D1: '我方不认可你方把单方理解直接当作责任依据。请先说明哪份协议、合同、订单、结算文件或确认记录写明了我方要承担你方主张的责任？',
                    D2: '我方不认可你方把履行争议直接说成完全未履行。请先指出具体哪项义务没有完成，已履行部分和争议部分分别是什么？',
                    D3: '我方不认可你方把责任全部归到我方。请先说明你方是否完成付款、配合、验收、资料提供、确认和及时反馈等义务？',
                    D4: '我方不认可你方仅凭片段材料就认定我方应承担责任。请先说清楚，哪份材料能直接证明责任，又如何对应具体交易事实？',
                    D5: '我方不认可你方只报一个总数。请把本金、价款、费用、利息、损失或返还款分别拆开，并说明每一项依据。',
                    D6: '我方可以沟通，但只接受在可证明范围内讨论。请先说明哪些请求有明确依据、哪些金额能客观核算，再谈是否继续协商。'
                };
                const keyed = {
                    D1: [
                        ['条款', '我方需要看到协议、交易文件或确认记录中的明确内容。请你方先指出哪一项写明了责任来源？'],
                        ['订单', '请你方把协议、订单、结算文件和确认记录对应起来，不能只作概括主张。'],
                        ['确认', '如果有确认文件，请直接指出其中哪一页、哪一项能证明我方承担你方主张的责任。']
                    ],
                    D2: [
                        ['履行', '请你方具体说明哪项义务没有做到，以及已履行部分和争议部分分别是什么。'],
                        ['服务', '你方要区分服务已经提供的部分和你方认为有争议的部分，不能笼统说完全没履行。'],
                        ['未按约', '请直接指出哪一次、哪一段、哪项服务未按约完成，不要只概括评价。']
                    ],
                    D3: [
                        ['配合', '我方先问清楚，你方是否完成了必要配合、确认和资料提供？这些没完成，后果不能都算到我方。'],
                        ['验收', '请你方说明是否已完成验收或确认，若未完成，争议责任怎么能直接归到我方？'],
                        ['付款', '你方是否已经完成付款和相应义务？如果没有，先把这个链条说完整。']
                    ],
                    D4: [
                        ['证据', '仅凭片段材料不能直接证明我方应承担责任。请你方说清楚哪份材料能对应哪项事实或义务。'],
                        ['责任', '哪份材料能直接证明我方应承担责任？又如何对应具体协议、交易事实或履行记录？'],
                        ['因果', '即便有争议材料，也要说明损失、金额或付款义务与我方行为之间的关联。']
                    ],
                    D5: [
                        ['金额', '你方主张的金额必须拆分计算，不能只报总数。请先说本金、价款、费用、损失或返还款分别是多少。'],
                        ['计算', '请你方把计算过程写清楚，是否存在重复计算或扩大计算？'],
                        ['退款', '如果主张返还款项，请说明可客观核算的部分有哪些，不能只给一个笼统数字。']
                    ],
                    D6: [
                        ['协商', '我方可以沟通，但只在可证明范围内谈。你方先说明哪些请求有明确依据。'],
                        ['调解', '调解可以谈，但前提是把可核算金额和明确依据先列清楚。'],
                        ['范围', '请你方先收窄到可证明范围内，再谈是否继续协商。']
                    ]
                };
                const matched = (keyed[card?.id || ''] || []).find(([keyword]) => normalized.includes(keyword));
                return matched ? matched[1] : (fallback[card?.id || 'D4'] || fallback.D4);
            };

            const startDefenseCard = (card) => {
                if (!card || aiIsThinking.value) return;
                clearAiReplyTimer();
                clearAiStreamTimer();
                aiInput.value = '';
                resetAiAttachment();
                syncAiPresetState(card);
                aiIsThinking.value = true;
                scrollAiChatToBottom();
                scheduleAiReply(card.openingMessage || buildDefenseReply(card, card.title), 650);
            };
            const streamAiMessage = (text, streamOptions = {}) => getAiTypewriter().streamMessage(text, {
                afterCompleteHtml: getMediationAfterCompleteHtml(),
                ...streamOptions
            });
            const scheduleAiReply = (reply, delay = aiReplyDelay, streamOptions) => getAiTypewriter().scheduleReply(reply, delay, {
                afterCompleteHtml: getMediationAfterCompleteHtml(),
                ...(streamOptions || {})
            });

            const setAiStaticGreeting = () => {
                aiMessages.value = [];
                aiIsThinking.value = false;
                aiFinishTooltipVisible.value = false;
                scrollAiChatToTop();
            };

            const startAiConsult = () => {
                waitingForInteraction.value = false;
                showDialog.value = false;
                aiInput.value = '';
                resetAiAttachment();
                aiMessageId = 0;
                aiMessages.value = [];
                aiDefenseRoundCount.value = 0;
                selectedAiPresetCard.value = null;
                aiFinishTooltipVisible.value = false;
                aiIsThinking.value = false;
                stage.value = 'ai_consult';
                setAiStaticGreeting();
            };

            const getAiReply = (question) => {
                const card = selectedAiPresetCard.value || aiPresetCards.value[0];
                return buildDefenseReply(card, question);
            };

            const sendAiMessage = () => {
                const text = aiInput.value.trim();
                if (!text || aiIsThinking.value) return;
                if (!hasSelectedAiPreset.value) {
                    showAiFinishTooltip();
                    return;
                }
                clearAiStreamTimer();

                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'user',
                    content: escapeHtml(text),
                    streaming: false
                });
                aiDefenseRoundCount.value += 1;
                aiInput.value = '';
                scrollAiChatToBottom();

                aiIsThinking.value = true;
                scheduleAiReply(() => getAiReply(text));
            };

            const chooseAiPreset = (card) => {
                if (aiIsThinking.value) return;
                clearAiStreamTimer();
                startDefenseCard(card);
            };

            const triggerAiFileUpload = () => {
                if (aiIsThinking.value || !hasSelectedAiPreset.value) return;
                if (aiFileInput.value) {
                    aiFileInput.value.click();
                }
            };

            const handleAiFileChange = (event) => {
                const file = event.target.files && event.target.files[0];
                if (!file || aiIsThinking.value || !hasSelectedAiPreset.value) return;
                clearAiStreamTimer();
                clearAiOcrTimer();
                const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
                if (!isPdf) {
                    aiAttachmentName.value = '';
                    aiOcrStatus.value = 'error';
                    aiMessages.value.push({
                        id: ++aiMessageId,
                        role: 'assistant',
                        content: '当前仅支持上传 PDF 文件。请重新选择 PDF 材料，或直接说明相关内容。',
                        streaming: false
                    });
                    event.target.value = '';
                    scrollAiChatToBottom();
                    return;
                }
                if (file.size > 20 * 1024 * 1024) {
                    aiAttachmentName.value = '';
                    aiOcrStatus.value = 'error';
                    aiMessages.value.push({
                        id: ++aiMessageId,
                        role: 'assistant',
                        content: '文件大小超过 20MB，请压缩后重新上传，或直接说明相关内容。',
                        streaming: false
                    });
                    event.target.value = '';
                    scrollAiChatToBottom();
                    return;
                }
                aiAttachmentName.value = file.name;
                aiOcrStatus.value = 'processing';

                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'user',
                    content: `已上传 PDF 材料：${escapeHtml(file.name)}`,
                    streaming: false
                });
                scrollAiChatToBottom();
                aiOcrTimer = setTimeout(() => {
                    aiOcrStatus.value = 'success';
                    aiOcrTimer = null;
                    aiMessages.value.push({
                        id: ++aiMessageId,
                        role: 'assistant',
                        content: '我方已看到你方补充的材料。材料内容仍需结合协议、交易事实、履行记录和金额计算核对。请你方指出，这份材料具体对应哪一项请求？',
                        streaming: false
                    });
                    scrollAiChatToBottom();
                }, 900);
                event.target.value = '';
            };

            const finishAiConsult = () => {
                if (!canFinishAiConsult.value || aiIsThinking.value) {
                    showAiFinishTooltip();
                    return;
                }
                aiIsThinking.value = false;
                hideAiFinishTooltip();
                clearAiReplyTimer();
                clearAiStreamTimer();
                try {
                    const completed = JSON.parse(localStorage.getItem('filingDemoCompletedPaths') || '{}');
                    completed.defense = true;
                    localStorage.setItem('filingDemoCompletedPaths', JSON.stringify(completed));
                } catch (error) {
                    localStorage.setItem('filingDemoCompletedPaths', JSON.stringify({ defense: true }));
                }
                window.location.href = './Step5CaseInfoConfirmation.html';
            };

            const goToStep5Direct = () => {
                if (aiIsThinking.value) {
                    aiIsThinking.value = false;
                    clearAiReplyTimer();
                    clearAiStreamTimer();
                }
                try {
                    const completed = JSON.parse(localStorage.getItem('filingDemoCompletedPaths') || '{}');
                    completed.defense = true;
                    localStorage.setItem('filingDemoCompletedPaths', JSON.stringify(completed));
                } catch (error) {
                    localStorage.setItem('filingDemoCompletedPaths', JSON.stringify({ defense: true }));
                }
                window.location.href = './Step5CaseInfoConfirmation.html';
            };

            const handleFinishButtonClick = (event) => {
                if (!canFinishAiConsult.value || aiIsThinking.value) {
                    event?.preventDefault?.();
                    showAiFinishTooltip();
                    return;
                }
                finishAiConsult();
            };

            const advanceQuestionLogic = () => {
                if (currentQuestionIndex.value < questions.length - 1) {
                    currentQuestionIndex.value++;

                    const comment = npcComments[currentQuestionIndex.value] || "收到，请继续。";
                    speak(comment + " 下一题...", true);
                } else {
                    waitingForInteraction.value = false;
                    startAiConsult();
                }
            };

            const answerQuestion = (option, event) => {
                awardCurrentQuestionPoints(event);
                checkMilestones();

                const optionIndex = questions[currentQuestionIndex.value].options.indexOf(option);

                const optionCVideoMap = [
                    '口头承诺难维权优先调解降风险.mp4',
                    '感觉课程没效果维权能成功吗.mp4',
                    '机构换老师能要求退一赔三吗.mp4',
                    '退课这样退费避免损失.mp4',
                    '课程过期难退费试试这样协商.mp4'
                ];

                if (optionIndex === 2 && optionCVideoMap[currentQuestionIndex.value]) {
                    videoSrc.value = `${videoBasePath}${optionCVideoMap[currentQuestionIndex.value]}`;
                    showVideoModal.value = true;
                    pendingNextQuestion.value = true;
                    return;
                }

                advanceQuestionLogic();
            };

            // Step 4: Report & Path Choice
            const choosePath = (path) => {
                waitingForInteraction.value = false;
                if (!isFilingCompleted.value) {
                    markFilingCompleted(path);
                }
                
                if (path === 'mediation') {
                    stage.value = 'enter_apply';
                    applyChannel.value = '调解';
                speak("您的立案申请已收到，同步为您安排【调解】路径，我们至迟会在三个工作日内联系您，请您留意短信或电话，您也可以随时登录官网查询。", true);
                } else {
                    stage.value = 'success';
                    finalDest.value = '撤回';
                    speak("已为您撤回案件，可返回“草稿”查看。");
                }
            };

            const returnToDraftList = () => {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'navigate-demo-page', key: 'filing' }, '*');
                    return;
                }
                window.location.href = './在线立案申请-第六步提交页.html';
            };

            const contactService = () => {
                waitingForInteraction.value = false;
                if (!isFilingCompleted.value) {
                    markFilingCompleted('arbitration');
                }
                stage.value = 'enter_apply';
                applyChannel.value = '仲裁';
                speak("您选择了【仲裁】路径。立案申请已提交成功，请查看收案信息与当前状态。", true);
            };

            // Step 5: Final Apply
            const submitFinalApply = () => {
                 waitingForInteraction.value = false;
                 stage.value = 'success';
                 if (applyChannel.value === '调解') {
                     finalDest.value = '调解';
                     speak("提交成功！您的案件已进入调解系统，调解员将在三个工作日内联系您。");
                 } else {
                     finalDest.value = '仲裁';
                     speak("提交成功！您的案件已进入仲裁系统，工作人员将在三个工作日内联系您。");
                 }
            };

            const resetGame = () => {
                waitingForInteraction.value = false;
                showDialog.value = false;
                stage.value = 'ai_consult';
                aiInput.value = '';
                resetAiAttachment();
                aiMessageId = 0;
                aiMessages.value = [];
                aiDefenseRoundCount.value = 0;
                selectedAiPresetCard.value = null;
                aiFinishTooltipVisible.value = false;
                aiIsThinking.value = false;
                clearAiReplyTimer();
                clearAiStreamTimer();
                setAiStaticGreeting();
            };

            // Init
            onMounted(() => {
                // 演示模式：打开页面直接进入 AI 对话框，跳过前置答题流程。
                filingStatus.value = {
                    answeredQuestions: [],
                    earnedBadges: []
                };
                writeFilingStatus(filingStatus.value);
                earnedBadges.value = [];
                syncScoreFromStorage();
                waitingForInteraction.value = false;
                showDialog.value = false;
                aiInput.value = '';
                resetAiAttachment();
                aiMessageId = 0;
                aiDefenseRoundCount.value = 0;
                aiIsThinking.value = false;
                clearAiReplyTimer();
                clearAiStreamTimer();
                setAiStaticGreeting();
            });

            return {
                npcImage, mapImage,
                stage, subStage, showDialog, waitingForInteraction,
                displayedText, isTyping, handleDialogClick,
                mapPoints, questions, currentMapNodeIndex,
                showOverlayPanel,
                openPointsPage,
                currentQuestion, currentQuestionIndex, answerQuestion, prevQuestion,
                choosePath, finalDest, resetGame,
                applyChannel, submitFinalApply, pathLength, pathOffset,
                analysisData, filingMeta, confirmAnalysis,
                showCaseTypeBadge, scorePopups, contactService,
                showVideoModal, videoSrc, videoSpeed, videoPlayer, setVideoSpeed, closeVideo,
                aiInput, aiInputPlaceholder, aiMessages, aiPresetCards, aiIsThinking, aiChatBody, aiFileInput, aiAttachmentName, aiOcrStatus, aiOcrStatusText,
                aiDefenseRoundCount, canFinishAiConsult, selectedAiPresetCard, hasSelectedAiPreset, aiFinishTooltipVisible,
                filingProgressSteps, isProgressStepDone, getProgressStepClass,
                sendAiMessage, chooseAiPreset, triggerAiFileUpload, handleAiFileChange, finishAiConsult, handleFinishButtonClick, goToStep5Direct,
                reopenAiPresetCards, showAiFinishTooltip, hideAiFinishTooltip,
                confirmModal, showConfirmModal, closeConfirmModal, executeConfirmAction,
                score, badges, earnedBadges, toggleBadgeDrawer, isBadgeDrawerOpen,
                reportStep, nextReportStep, prevReportStep,
                isFilingCompleted, selectedReportPath,
                filingStatusTitle, filingStatusDesc,
                currentReportType, currentReportData,
                newBadgeCount, currentMilestone, flyingScores, scoreDisplay, scoreAnimate
            };
        }
    }).mount('#app');
