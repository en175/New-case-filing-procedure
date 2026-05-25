const { createApp, ref, computed, onMounted, onUnmounted, nextTick } = Vue;
const CaseAssessmentReport = window.CaseAssessmentReport;

/** PPT 演示模式：案情闯关点击任意位置 / 右方向键逐题推进，最后一题后跳转路径图 */
const PPT_DEMO_MODE = true;

    const app = createApp({
        components: CaseAssessmentReport
            ? { 'case-assessment-report': CaseAssessmentReport }
            : {},
        setup() {
            // Assets
            const directReport = false;
            const reportSource = '';
            const npcImage = ref('./图片/引导角色1.png');
            const mapImage = ref('./图片/智能服务大厅背景.png');

            // Game State
            const stage = ref('intro'); // intro, parsing, analysis_result, pre_qa, qa, enter_apply, success
            const subStage = ref(0);
            const showDialog = ref(true);
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
                if (['report', 'enter_apply', 'success'].includes(stage.value)) {
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
                // Keep panel visible for QA regardless of interaction state to prevent flickering.
                if (stage.value === 'qa') return true;
                if (stage.value === 'report') return true;
                
                return ['parsing', 'enter_apply', 'success', 'analysis_result'].includes(stage.value) && waitingForInteraction.value;
            });

            const optionNumber = (index) => {
                return String(index + 1);
            };

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
                        waitingForInteraction.value = false;
                        if (!PPT_DEMO_MODE) {
                            speak("请根据实际情况回答屏幕上方的问题。", true);
                        }
                        break;

                    case 'qa_done':
                        reportStep.value = 1;
                        stage.value = 'report';
                        speak("问答已完成，已为您生成案件评估报告，请查阅。", true);
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
                speak("系统正在为您扫描并解析案件关键要素...", true);
                
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

            const currentReportType = ref('default');

            const currentReportData = computed(() => {
                return window.getCaseAssessmentReportData(currentReportType.value);
            });

            const nextReportStep = () => {
                reportStep.value = 2;
                speak('广州仲裁委员会秉持“为每一起纠纷提供最佳解决方案”的目标愿景，在您排队等待仲裁立案的过程中，我们向您提供了一个更为快速、便捷、低成本的解决方式：调解，让您足不出户，一键解纷。点击“<span class="font-bold text-red-500">参与调解</span>”进入多元解纷调解平台。', true);
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
                    confirmModal.value.title = '确认参与调解？';
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
                closeConfirmModal();
                if (type === 'arbitration') {
                    contactService();
                } else {
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

            const finishPptQaFlow = () => {
                try {
                    const completed = JSON.parse(localStorage.getItem('filingDemoCompletedPaths') || '{}');
                    completed.quiz = true;
                    localStorage.setItem('filingDemoCompletedPaths', JSON.stringify(completed));
                } catch (error) {
                    localStorage.setItem('filingDemoCompletedPaths', JSON.stringify({ quiz: true }));
                }
                window.location.href = './案件路径图.html';
            };

            let pptAdvanceLocked = false;

            const advanceQuestionLogic = () => {
                if (currentQuestionIndex.value < questions.length - 1) {
                    currentQuestionIndex.value++;

                    const comment = npcComments[currentQuestionIndex.value] || "收到，请继续。";
                    speak(comment + " 下一题...", !PPT_DEMO_MODE);
                } else if (PPT_DEMO_MODE) {
                    finishPptQaFlow();
                } else {
                    waitingForInteraction.value = false;
                    reportStep.value = 1;
                    stage.value = 'report';
                    speak("所有问题已回答完毕，已为您生成案件评估报告，请查阅。", true);
                }
            };

            const advancePptQuestion = (event) => {
                if (!PPT_DEMO_MODE || stage.value !== 'qa') return;
                if (pptAdvanceLocked || showVideoModal.value || confirmModal.value.show || isBadgeDrawerOpen.value) {
                    return;
                }

                pptAdvanceLocked = true;
                window.setTimeout(() => {
                    pptAdvanceLocked = false;
                }, 280);

                awardCurrentQuestionPoints(event);
                checkMilestones();
                waitingForInteraction.value = false;
                advanceQuestionLogic();
            };

            const isPptAdvanceBlockedTarget = (target) => {
                if (!target?.closest) return true;
                if (target.closest('.qa-option-btn')) return false;
                return !!target.closest(
                    'button:not(.qa-option-btn), a, input, textarea, select, label, .badge-drawer, .demo-global-nav, .hud-bar, .points-hint-btn, video'
                );
            };

            const handlePptDemoClick = (event) => {
                if (!PPT_DEMO_MODE || stage.value !== 'qa') return;
                if (isPptAdvanceBlockedTarget(event.target)) return;
                advancePptQuestion(event);
            };

            const handlePptDemoKeydown = (event) => {
                if (!PPT_DEMO_MODE || stage.value !== 'qa') return;
                if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    advancePptQuestion(event);
                }
            };

            const answerQuestion = (option, event) => {
                if (PPT_DEMO_MODE) {
                    advancePptQuestion(event);
                    return;
                }

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
                    window.location.href = './调解申请提交结果.html';
                } else {
                    stage.value = 'success';
                    finalDest.value = '撤回';
                    speak("已为您撤回案件，可返回“草稿”查看。");
                }
            };

            const finishQaFlow = () => {
                try {
                    const completed = JSON.parse(localStorage.getItem('filingDemoCompletedPaths') || '{}');
                    completed.quiz = true;
                    localStorage.setItem('filingDemoCompletedPaths', JSON.stringify(completed));
                } catch (error) {
                    localStorage.setItem('filingDemoCompletedPaths', JSON.stringify({ quiz: true }));
                }
                if (localStorage.getItem('filingDemoAuxReturn') === 'report') {
                    localStorage.setItem('filingDemoOpenReport', 'auxTool');
                    window.location.href = './申请书bot.html?fromAux=quiz';
                    return;
                }
                window.location.href = './立案提交后路径选择.html';
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
                if (typeInterval) {
                    clearInterval(typeInterval);
                    typeInterval = null;
                }
                stage.value = 'intro';
                subStage.value = 0;
                showDialog.value = true;
                waitingForInteraction.value = false;
                pendingWaitInteraction.value = false;
                currentQuestionIndex.value = 0;
                reportStep.value = 1;
                showVideoModal.value = false;
                pendingNextQuestion.value = false;
                videoSrc.value = '';
                videoSpeed.value = 1.0;
                if (videoPlayer.value) {
                    videoPlayer.value.pause();
                    videoPlayer.value.currentTime = 0;
                }
                confirmModal.value.show = false;
                showCaseTypeBadge.value = false;
                currentDialogFull.value = '';
                displayedText.value = '';
                isTyping.value = false;
                speak("您好！我是您的智能立案助手“仲小雯”。欢迎来到广州仲裁委。");
            };

            const returnToPathChoice = () => {
                window.location.href = './立案提交后路径选择.html';
            };

            // Init
            onMounted(() => {
                localStorage.removeItem('filingDemoOpenReport');
                // 立案问答按当前这次演示重新开始，避免历史 localStorage 影响点击得分反馈和当前积分。
                filingStatus.value = {
                    answeredQuestions: [],
                    earnedBadges: []
                };
                writeFilingStatus(filingStatus.value);
                earnedBadges.value = [];
                syncScoreFromStorage();
                speak("您好！我是您的智能立案助手“仲小雯”。欢迎来到广州仲裁委。");
                window.setTimeout(() => {
                    if (stage.value === 'intro') {
                        maybeShowStartBadgeToast();
                    }
                }, 900);

                if (PPT_DEMO_MODE) {
                    document.addEventListener('click', handlePptDemoClick);
                    window.addEventListener('keydown', handlePptDemoKeydown);
                }
            });

            onUnmounted(() => {
                if (PPT_DEMO_MODE) {
                    document.removeEventListener('click', handlePptDemoClick);
                    window.removeEventListener('keydown', handlePptDemoKeydown);
                }
            });

            return {
                npcImage, mapImage,
                stage, subStage, showDialog, waitingForInteraction,
                displayedText, isTyping, handleDialogClick,
                mapPoints, questions, currentMapNodeIndex,
                showOverlayPanel,
                openPointsPage,
                currentQuestion, currentQuestionIndex, answerQuestion, prevQuestion,
                optionNumber,
                choosePath, finalDest, resetGame, finishQaFlow,
                returnToPathChoice,
                applyChannel, submitFinalApply, pathLength, pathOffset,
                analysisData, filingMeta, confirmAnalysis,
                showCaseTypeBadge, scorePopups, contactService,
                showVideoModal, videoSrc, videoSpeed, videoPlayer, setVideoSpeed, closeVideo,
                confirmModal, showConfirmModal, closeConfirmModal, executeConfirmAction,
                score, badges, earnedBadges, toggleBadgeDrawer, isBadgeDrawerOpen,
                reportStep, nextReportStep, prevReportStep,
                isFilingCompleted, selectedReportPath,
                currentReportType, currentReportData,
                newBadgeCount, currentMilestone, flyingScores, scoreDisplay, scoreAnimate
            };
        }
    });

    if (CaseAssessmentReport) {
        app.component('case-assessment-report', CaseAssessmentReport);
    } else {
        console.error(
            '[game-qa] CaseAssessmentReport 未加载，请确认已在 game-qa-app.js 之前引入 assets/shared/case-assessment-report.js'
        );
    }

    app.mount('#app');
