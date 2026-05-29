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
            const showAiServiceNotice = ref(true);
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
                caseType: '教育培训合同退费纠纷',
                amount: '18,800.00 元',
                applicantType: '自然人',
                respondentType: '企业',
                requests: [
                    { amount: '18,800.00 元', content: '请求裁决解除《网络教育咨询服务协议》，并由被申请人退还课程费用18,800.00元。' },
                    { amount: '以实际发生为准', content: '请求裁决被申请人承担本案仲裁费。' }
                ]
            });
            const filingMeta = ref({
                caseNo: '2026012150',
                submitTime: '2026-03-20 10:08',
                status: '审核中'
            });
            const filingProgressSteps = [
                '资料提交',
                '答题关卡',
                '案件评估报告',
                '后续路径'
            ];
            const filingSteps = [
                {
                    title: '申请人信息',
                    fullName: '第三步：申请人信息',
                    desc: '核对申请人、代理人和主体证明材料。',
                    file: './Step3PartyConfirmation.html',
                    icon: 'fas fa-user-check',
                    prompt: '先核对申请人信息。请重点确认申请人属性、身份信息、联系方式、送达地址和代理人信息。',
                    risks: [
                        '申请人名称、证件号码或主体资格材料错误，可能导致后续补正。',
                        '送达地址、手机、邮箱不准确，可能影响后续通知接收。',
                        '有代理人时，授权委托书和代理人身份证明需要同步核对。'
                    ]
                },
                {
                    title: '被申请人信息',
                    fullName: '第四步：被申请人信息',
                    desc: '核对对方主体、联系方式和地址依据。',
                    file: './Step4RespondentConfirmation.html',
                    icon: 'fas fa-building-user',
                    prompt: '现在核对被申请人信息。请重点确认对方主体名称、证件或统一社会信用代码、联系电话、法定地址、合同约定地址和其他地址依据。',
                    risks: [
                        '被申请人主体识别错误，会影响送达、审查和后续程序推进。',
                        '只填写模糊地址或缺少地址依据，可能增加送达风险。',
                        '企业主体的法人信息和营业执照材料需要与登记信息保持一致。'
                    ]
                },
                {
                    title: '案件信息证据',
                    fullName: '第五步：案件信息确认',
                    desc: '核对请求、事实理由、仲裁依据和证据。',
                    file: './Step5CaseInfoConfirmation.html',
                    icon: 'fas fa-folder-tree',
                    prompt: '进入案件信息与证据核对。请按每一项仲裁请求反查事实理由、金额依据、仲裁条款、合同签章页、证据目录和证据文件。',
                    risks: [
                        '仲裁请求未分项、金额无计算依据，可能影响标的核定和费用测算。',
                        '仲裁条款或合同签章页缺失，可能导致管辖依据不足。',
                        '证据目录、证据文件和证明目的不对应，可能影响材料完整性判断。'
                    ]
                },
                {
                    title: '送达提交',
                    fullName: '第六步：送达地址确认',
                    desc: '核对送达方式、送达地址和开票信息。',
                    file: './Step6DeliveryAddressConfirmation.html',
                    icon: 'fas fa-paper-plane',
                    prompt: '最后核对送达与提交信息。请确认电子送达或传统送达方式、我方送达地址、对方送达地址、送达确认书和开票信息。',
                    risks: [
                        '送达地址或联系方式不准确，可能影响通知、材料和文书送达。',
                        '未保存我方或对方送达信息时，不应进入下一步。',
                        '开票核心信息不完整，可能影响后续收费和票据处理。'
                    ]
                }
            ];
            const currentFilingStepIndex = ref(0);
            const completedFilingSteps = ref([]);
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
            const aiScrollBody = ref(null);
            const aiChatBody = ref(null);
            const aiFileInput = ref(null);
            const aiAttachmentName = ref('');
            const currentUploadContext = ref('general');
            const evidenceUploadStage = ref('none');
            const evidenceCatalogFiles = ref([]);
            const evidenceGroups = ref([]);
            const aiReplyDelay = 700;
            const randomDelay = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
            const randomTextReplyDelay = () => randomDelay(1000, 2000);
            const randomUploadReplyDelay = () => randomDelay(3000, 4000);
            const randomTemplateRenderDelay = () => randomDelay(3000, 4000);
            let aiMessageId = 0;
            const aiMessages = ref([]);
            let aiTypewriter = null;
            const applicationConfirmed = ref(false);
            const applicationTransferReady = ref(false);
            const uploadRules = {
                general: {
                    required: false,
                    accept: '.PDF,.JPG,.JPEG,.PNG',
                    text: '<strong>上传规则：</strong>支持 PDF、JPG、JPEG、PNG；请上传清晰、完整、与当前问题相关的材料，单文件最大不超过 50MB。'
                },
                applicant: {
                    required: true,
                    accept: '.PDF,.JPG,.JPEG,.PNG',
                    text: '<strong>申请人/代理人材料：</strong>身份证明、主体资格材料、授权委托书、所函、律师证、工作证明、亲属证明等；支持 PDF、JPG、JPEG、PNG，单文件最大不超过 50MB。'
                },
                respondent: {
                    required: true,
                    accept: '.PDF,.JPG,.JPEG,.PNG',
                    text: '<strong>被申请人材料：</strong>人口信息查询单、身份证明、营业执照、法人身份证明书、其他地址依据说明附件等；支持 PDF、JPG、JPEG、PNG，单文件最大不超过 50MB。'
                },
                caseEvidence: {
                    required: true,
                    accept: '.PDF',
                    text: '<strong>案件事实材料：</strong>如有合同、付款凭证、沟通记录等材料，可作为申请书事实补充参考；申请书生成后请进入第二步正式上传材料。'
                },
                delivery: {
                    required: true,
                    accept: '.PDF',
                    text: '<strong>送达材料：</strong>我方和对方送达地址确认书支持 PDF，多份确认书可一次上传，单文件最大不超过 50MB。'
                }
            };
            const finalReviewReady = ref(false);
            const showFloatingFinalReportButton = computed(() => false);
            const finalApplicationHtml = ref('');
            const finalApplicationSaved = ref(false);
            const applicationGenerating = ref(false);
            const applicationGenerated = ref(false);
            const applicationEditable = ref(false);
            const generatedApplicationSource = ref('');
            const currentUploadRule = computed(() => {
                return uploadRules[currentUploadContext.value] || uploadRules.general;
            });
            const conversationStepIndex = ref(0);
            const applicationReady = ref(false);
            const showApplicationDemoStepButton = ref(false);
            const showApplicationAutoFillButton = ref(false);
            const isCurrentUploadStep = computed(() => currentUploadRule.value.required);
            const applicationDraft = ref({
                applicant: '',
                respondent: '',
                claims: '',
                facts: '',
                evidence: ''
            });
            const buildAiReply = ({ lead, rows = [], steps = [], note = '' }) => {
                const textRows = rows.map(row => `${row.label}：${row.value}`).join('\n');
                const stepRows = steps.map(step => String(step)).join('\n');
                const textBlocks = [textRows, stepRows].filter(Boolean).join('\n');
                return `
                    <div class="ai-reply-lead">${String(lead || '').trim()}</div>
                    ${textBlocks ? `<div class="ai-reply-text">${textBlocks}</div>` : ''}
                    ${note ? `<div class="ai-reply-note">${note}</div>` : ''}
                `.trim();
            };
            const getTodayParts = () => {
                const now = new Date();
                return {
                    year: String(now.getFullYear()),
                    month: String(now.getMonth() + 1).padStart(2, '0'),
                    day: String(now.getDate()).padStart(2, '0')
                };
            };
            const draftText = (key, fallback = '请核对并补充') => {
                const value = applicationDraft.value[key];
                return escapeHtml(value && String(value).trim() ? value : fallback);
            };
            const buildFilledField = (field, value, className = 'short', placeholder = '请核对并补充') => `
                <div class="application-fill ${className}" contenteditable="true" data-required="true" data-field="${field}" data-placeholder="${placeholder}">${value}</div>
            `;
            const buildApplicationTemplatePreviewHtml = () => {
                const docField = (field, value, className = '') => `
                    <span class="application-fill doc-fill ${className}" data-field="${field}" data-placeholder="">${escapeHtml(value)}</span>
                `;
                const docBlock = (field, value, className = '') => `
                    <div class="application-fill doc-fill doc-fill-block ${className}" data-field="${field}" data-placeholder="">${escapeHtml(value)}</div>
                `;
                return `
                    <section class="doc-page doc-page-compact">
                        <div class="doc-crop top-left"></div>
                        <div class="doc-crop top-right"></div>
                        <div class="doc-crop bottom-left"></div>
                        <div class="doc-crop bottom-right"></div>
                        <div class="doc-title">仲裁申请书</div>
                        <div class="doc-row"><strong>申请人：</strong>${docField('申请人姓名', '陈某（已脱敏）', 'w-name')}</div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>性别：${docField('申请人性别', '男', 'w-xs')}</span>
                            <span>年龄：${docField('申请人年龄', '34岁', 'w-xs')}</span>
                        </div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>职业：${docField('申请人职业', '自由职业', 'w-sm')}</span>
                            <span>工作单位：${docField('申请人工作单位', '无固定工作单位', 'w-md')}</span>
                        </div>
                        <div class="doc-row">身份证号码：${docField('申请人身份证号码', '440***************', 'w-id')}</div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>住所：${docField('申请人住所', '广东省广州市********', 'w-line')}</span>
                            <span>联系电话：${docField('申请人联系电话', '138****0000', 'w-phone')}</span>
                        </div>
                        <div class="doc-row"><strong>被申请人：</strong>${docField('被申请人名称', '广州某教育科技有限公司', 'w-name-long')}</div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>法定代表人/负责人：${docField('法定代表人或负责人', '林某某', 'w-md')}</span>
                            <span>职务：${docField('职务', '执行董事', 'w-sm')}</span>
                        </div>
                        <div class="doc-row">统一社会信用代码：${docField('统一社会信用代码', '9144**************', 'w-code')}</div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>住所：${docField('被申请人住所', '广东省广州市********', 'w-line')}</span>
                            <span>联系电话：${docField('被申请人联系电话', '020-********', 'w-phone')}</span>
                        </div>
                        <div class="doc-section-title">仲裁请求：</div>
                        <div class="doc-request-line">（一）${docField('仲裁请求一', '请求解除课程服务协议。', 'w-request')}</div>
                        <div class="doc-request-line">（二）${docField('仲裁请求二', '请求退还课程费用18800.00元。', 'w-request')}</div>
                        <div class="doc-request-line">（三）${docField('仲裁请求三', '请求承担本案仲裁费。', 'w-request')}</div>
                        <div class="doc-request-line">（四）${docField('仲裁请求四', '暂不主张违约金及其他损失。', 'w-request')}</div>
                        <div class="doc-section-title">事实与理由：</div>
                        ${docBlock('事实与理由', '申请人与被申请人于2024年5月7日签署《网络教育咨询服务协议》，约定由被申请人向申请人提供“VIP导师保障营”课程服务，课程费用为18800.00元，协议同时约定争议提交广州仲裁委员会解决。申请人已依约支付课程费用。履行过程中，被申请人多次出现课程延期、安排调整等情况，申请人据此认为其未按约持续、完整提供课程服务。双方后续虽就课程冻结事项作出安排，但延期与退款争议仍未得到解决。申请人曾通过微信及退款申请材料提出解除合同、退还课程费用的请求，未与被申请人达成一致。现申请人依据双方仲裁条款申请仲裁，请求支持上述仲裁请求。', 'doc-facts')}
                        <div class="doc-section-title">证据目录（摘要）：</div>
                        ${docBlock('证据目录说明', '1.《网络教育咨询服务协议》及仲裁条款；2.课程宣传页、学习账号截图及付款凭证；3.延期通知、微信沟通记录及退款申请材料；4.课程冻结申请及其他补充证明。', 'doc-evidence-block')}
                        <div class="doc-closing">
                            <div>此致</div>
                            <div>广州仲裁委员会</div>
                        </div>
                        <div class="doc-signature">
                            <div>申请人：${docField('落款申请人', '陈某', 'w-sm')}</div>
                            <div>（签名或盖章）</div>
                            <div class="doc-date">
                                ${docField('落款年份', '2026', 'w-year')}年
                                ${docField('落款月份', '5', 'w-date-part')}月
                                ${docField('落款日期', '29', 'w-date-part')}日
                            </div>
                        </div>
                    </section>
                `;
            };
            const buildFinalApplicationDocumentHtml = ({ editable = true } = {}) => {
                const today = getTodayParts();
                const editableAttr = editable ? 'contenteditable="true"' : '';
                const docField = (field, value, className = '') => `
                    <span class="application-fill doc-fill ${className}" ${editableAttr} data-required="true" data-field="${field}" data-placeholder="">${escapeHtml(value)}</span>
                `;
                const docBlock = (field, value, className = '') => `
                    <div class="application-fill doc-fill doc-fill-block ${className}" ${editableAttr} data-required="true" data-field="${field}" data-placeholder="">${escapeHtml(value)}</div>
                `;
                const applicantName = '陈某';
                const applicantId = '440***************';
                const applicantGender = '男';
                const applicantAge = '34岁';
                const applicantAddress = '广东省广州市天河区********';
                const applicantPhone = '138****0000';
                const respondentName = '广州师大博学技术有限公司';
                const respondentCreditCode = '9144**************';
                const respondentAddress = '广州市白云区********';
                const respondentPhone = '020-********';
                const facts = '申请人与被申请人于2024年5月7日签署《网络教育咨询服务协议》，约定由被申请人向申请人提供“VIP导师保障营”课程服务，课程费用为18800.00元，协议同时约定争议提交广州仲裁委员会解决。\n\n申请人已按约支付课程费用。根据课程宣传页、学习账号截图及相关材料，被申请人已为申请人开通学习账号，但在后续履行过程中多次出现课程延期、安排调整等情况。申请人据此认为，被申请人未能持续、完整提供约定课程服务。\n\n双方后续另就课程冻结事项作出安排，冻结期限为2025年1月2日至2026年1月2日。尽管如此，课程延期与退款争议仍未得到解决。申请人曾通过微信及退款申请材料向被申请人提出解除合同、退还课程费用的请求，但双方未就全额退费方案达成一致。\n\n申请人认为，被申请人未按约履行课程服务，且在申请人提出退款后未能妥善处理，现依据双方仲裁条款向广州仲裁委员会申请仲裁，请求支持上述仲裁请求。';
                const evidence = '1.《网络教育咨询服务协议》及仲裁条款；2.课程宣传页、学习账号截图及付款凭证；3.延期通知、微信沟通记录及退款申请材料；4.课程冻结申请及其他补充证明。';
                return `
                    <section class="doc-page doc-page-compact">
                        <div class="doc-crop top-left"></div>
                        <div class="doc-crop top-right"></div>
                        <div class="doc-crop bottom-left"></div>
                        <div class="doc-crop bottom-right"></div>
                        <div class="doc-title">仲裁申请书</div>
                        <div class="doc-row"><strong>申请人：</strong>${docField('申请人姓名', applicantName, 'w-name')}</div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>性别：${docField('申请人性别', applicantGender, 'w-xs')}</span>
                            <span>年龄：${docField('申请人年龄', applicantAge, 'w-xs')}</span>
                        </div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>职业：${docField('申请人职业', '自由职业', 'w-sm')}</span>
                            <span>工作单位：${docField('申请人工作单位', '无固定工作单位', 'w-md')}</span>
                        </div>
                        <div class="doc-row">身份证号码：${docField('申请人身份证号码', applicantId, 'w-id')}</div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>住所：${docField('申请人住所', applicantAddress, 'w-line')}</span>
                            <span>联系电话：${docField('申请人联系电话', applicantPhone, 'w-phone')}</span>
                        </div>
                        <div class="doc-row"><strong>被申请人：</strong>${docField('被申请人名称', respondentName, 'w-name-long')}</div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>法定代表人/负责人：${docField('法定代表人或负责人', '林某某', 'w-md')}</span>
                            <span>职务：${docField('职务', '执行董事', 'w-sm')}</span>
                        </div>
                        <div class="doc-row">统一社会信用代码：${docField('统一社会信用代码', respondentCreditCode, 'w-code')}</div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>住所：${docField('被申请人住所', respondentAddress, 'w-line')}</span>
                            <span>联系电话：${docField('被申请人联系电话', respondentPhone, 'w-phone')}</span>
                        </div>
                        <div class="doc-section-title">仲裁请求：</div>
                        <div class="doc-request-line">（一）${docField('仲裁请求一', '请求裁决解除《网络教育咨询服务协议》。', 'w-request')}</div>
                        <div class="doc-request-line">（二）${docField('仲裁请求二', '请求裁决被申请人退还课程费用18800.00元。', 'w-request')}</div>
                        <div class="doc-request-line">（三）${docField('仲裁请求三', '请求裁决被申请人承担本案仲裁费。', 'w-request')}</div>
                        <div class="doc-request-line">（四）${docField('仲裁请求四', '申请人暂不主张违约金、利息等其他损失。', 'w-request')}</div>
                        <div class="doc-section-title">事实与理由：</div>
                        ${docBlock('事实与理由', facts, 'doc-facts')}
                        <div class="doc-section-title">证据目录（摘要）：</div>
                        ${docBlock('证据目录说明', evidence, 'doc-evidence-block')}
                        <div class="doc-closing">
                            <div>此致</div>
                            <div>广州仲裁委员会</div>
                        </div>
                        <div class="doc-signature">
                            <div>申请人：${docField('落款申请人', applicantName, 'w-sm')}</div>
                            <div>（签名或盖章）</div>
                            <div class="doc-date">
                                ${docField('落款年份', '2026', 'w-year')}年
                                ${docField('落款月份', '5', 'w-date-part')}月
                                ${docField('落款日期', '29', 'w-date-part')}日
                            </div>
                        </div>
                    </section>
                `;
            };
            const buildDemoApplicationDocumentHtml = (sourceText = '', { editable = false } = {}) => {
                const source = String(sourceText || '').trim();
                const editableAttr = editable ? 'contenteditable="true"' : '';
                const field = (className, value, name = '') => `<span class="application-fill doc-fill ${className}" ${editableAttr} data-field="${name}">${escapeHtml(value)}</span>`;
                const block = (className, value, name = '') => `<div class="application-fill doc-fill doc-fill-block ${className}" ${editableAttr} data-field="${name}">${escapeHtml(value).replace(/\n/g, '<br>')}</div>`;
                const factsLead = source
                    ? `申请人与被申请人就教育培训退费事宜发生争议。申请人通过本次对话提出生成申请书的需求，系统据此生成一份用于演示的仲裁申请书草稿。原始输入为：${source}。`
                    : '申请人与被申请人就教育培训退费事宜发生争议，申请人现依据双方仲裁条款申请仲裁。';
                const facts = `${factsLead}\n\n申请人已按约支付课程费用。根据课程宣传页、学习账号截图及相关材料，被申请人已为申请人开通学习账号，但在后续履行过程中多次出现课程延期、安排调整等情况。申请人据此认为，被申请人未能持续、完整提供约定课程服务。\n\n双方后续另就课程冻结事项作出安排，冻结期限为2025年1月2日至2026年1月2日。尽管如此，课程延期与退款争议仍未得到解决。申请人曾通过微信及退款申请材料向被申请人提出解除合同、退还课程费用的请求，但双方未就全额退费方案达成一致。\n\n申请人认为，被申请人未按约履行课程服务，且在申请人提出退款后未能妥善处理，现依据双方仲裁条款向广州仲裁委员会申请仲裁，请求支持上述仲裁请求。`;
                const evidence = '1.《网络教育咨询服务协议》及仲裁条款；2.课程宣传页、学习账号截图及付款凭证；3.延期通知、微信沟通记录及退款申请材料；4.课程冻结申请及其他补充证明。';
                return `
                    <section class="doc-page doc-page-compact">
                        <div class="doc-crop top-left"></div>
                        <div class="doc-crop top-right"></div>
                        <div class="doc-crop bottom-left"></div>
                        <div class="doc-crop bottom-right"></div>
                        <div class="doc-title">仲裁申请书</div>
                        <div class="doc-row"><strong>申请人：</strong>${field('w-name', '陈某', '申请人')}</div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>性别：${field('w-xs', '男', '性别')}</span>
                            <span>年龄：${field('w-xs', '34岁', '年龄')}</span>
                        </div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>职业：${field('w-sm', '自由职业', '职业')}</span>
                            <span>工作单位：${field('w-md', '无固定工作单位', '工作单位')}</span>
                        </div>
                        <div class="doc-row">身份证号码：${field('w-id', '440***************', '身份证号码')}</div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>住所：${field('w-line', '广东省广州市天河区********', '申请人住所')}</span>
                            <span>联系电话：${field('w-phone', '138****0000', '申请人电话')}</span>
                        </div>
                        <div class="doc-row"><strong>被申请人：</strong>${field('w-name-long', '广州师大博学技术有限公司', '被申请人')}</div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>法定代表人/负责人：${field('w-md', '林某某', '法定代表人')}</span>
                            <span>职务：${field('w-sm', '执行董事', '职务')}</span>
                        </div>
                        <div class="doc-row">统一社会信用代码：${field('w-code', '9144**************', '统一社会信用代码')}</div>
                        <div class="doc-row doc-row-grid compact-two-col">
                            <span>住所：${field('w-line', '广州市白云区********', '被申请人住所')}</span>
                            <span>联系电话：${field('w-phone', '020-********', '被申请人电话')}</span>
                        </div>
                    </section>
                    <section class="doc-page doc-page-compact">
                        <div class="doc-crop top-left"></div>
                        <div class="doc-crop top-right"></div>
                        <div class="doc-crop bottom-left"></div>
                        <div class="doc-crop bottom-right"></div>
                        <div class="doc-section-title">仲裁请求：</div>
                        <div class="doc-request-line">（一）${field('w-request', '请求裁决解除《网络教育咨询服务协议》。', '仲裁请求一')}</div>
                        <div class="doc-request-line">（二）${field('w-request', '请求裁决被申请人退还课程费用18800.00元。', '仲裁请求二')}</div>
                        <div class="doc-request-line">（三）${field('w-request', '请求裁决被申请人承担本案仲裁费。', '仲裁请求三')}</div>
                        <div class="doc-request-line">（四）${field('w-request', '申请人暂不主张违约金、利息等其他损失。', '仲裁请求四')}</div>
                        <div class="doc-section-title">事实与理由：</div>
                        ${block('doc-facts', facts, '事实与理由')}
                        <div class="doc-section-title">证据目录（摘要）：</div>
                        ${block('doc-evidence-block', evidence, '证据目录')}
                        <div class="doc-closing">
                            <div>此致</div>
                            <div>广州仲裁委员会</div>
                        </div>
                        <div class="doc-signature">
                            <div>申请人：${field('w-sm', '陈某', '落款申请人')}</div>
                            <div>（签名或盖章）</div>
                            <div class="doc-date">
                                ${field('w-year', '2026', '落款年份')}年
                                ${field('w-date-part', '5', '落款月份')}月
                                ${field('w-date-part', '29', '落款日期')}日
                            </div>
                        </div>
                    </section>
                `;
            };
            const applicationTemplateHtml = computed(() => buildDemoApplicationDocumentHtml('', { editable: false }));
            const buildFinalApplicationReviewHtml = () => {
                return `
                    <div class="application-generate-card" data-module="final-application-review">
                        <div class="application-generate-title">申请书初稿已生成</div>
                        <div class="application-generate-desc">系统已在左侧生成《仲裁申请书》初稿。请在左侧文书区核对，必要时点击“编辑”，确认无误后点击“确认并下一步”。</div>
                    </div>
                `;
            };
            const conversationFields = [
                {
                    key: 'facts',
                    label: '案件基本情况',
                    context: 'caseEvidence',
                    demo: '教育培训退费纠纷，申请人要求解除协议并退还18800.00元。',
                    final: true,
                    keywords: ['生成', '申请书', '仲裁', '退费', '退款', '合同', '培训', '纠纷']
                }
            ];
            const buildArbitrationApplicationHtml = () => `
                <div class="arbitration-flow-card" data-module="arbitration-application">
                    <div class="flow-card-head">
                        <div>
                            <div class="flow-card-title">《仲裁申请书》草稿</div>
                        </div>
                        <div class="flow-card-status">待您填写并确认</div>
                    </div>
                    <article class="application-paper">
                        <div class="paper-title">仲裁申请书</div>
                        <div class="paper-section">
                            <div class="paper-section-title">申请人：</div>
                            <div class="paper-field-grid">
                                <div class="paper-field">
                                    <label>姓名/名称</label>
                                    <div class="application-fill short" contenteditable="true" data-required="true" data-field="申请人姓名/名称" data-placeholder="请输入"></div>
                                </div>
                                <div class="paper-field">
                                    <label>证件号/统一社会信用代码</label>
                                    <div class="application-fill short" contenteditable="true" data-required="true" data-field="申请人证件号或统一社会信用代码" data-placeholder="请输入"></div>
                                </div>
                                <div class="paper-field full">
                                    <label>住所/联系地址</label>
                                    <div class="application-fill short" contenteditable="true" data-required="true" data-field="申请人住所" data-placeholder="请输入"></div>
                                </div>
                                <div class="paper-field">
                                    <label>联系电话</label>
                                    <div class="application-fill short" contenteditable="true" data-required="true" data-field="申请人联系电话" data-placeholder="请输入"></div>
                                </div>
                            </div>
                        </div>
                        <div class="paper-section">
                            <div class="paper-section-title">被申请人：</div>
                            <div class="paper-field-grid">
                                <div class="paper-field">
                                    <label>姓名/名称</label>
                                    <div class="application-fill short" contenteditable="true" data-required="true" data-field="被申请人姓名/名称" data-placeholder="请输入"></div>
                                </div>
                                <div class="paper-field">
                                    <label>证件号/统一社会信用代码</label>
                                    <div class="application-fill short" contenteditable="true" data-required="true" data-field="被申请人证件号或统一社会信用代码" data-placeholder="请输入"></div>
                                </div>
                                <div class="paper-field full">
                                    <label>住所/联系地址</label>
                                    <div class="application-fill short" contenteditable="true" data-required="true" data-field="被申请人住所" data-placeholder="请输入"></div>
                                </div>
                                <div class="paper-field">
                                    <label>联系电话</label>
                                    <div class="application-fill short" contenteditable="true" data-required="true" data-field="被申请人联系电话" data-placeholder="请输入"></div>
                                </div>
                            </div>
                        </div>
                        <div class="paper-section">
                            <div class="paper-section-title">仲裁请求：</div>
                            <div class="paper-field-grid">
                                <div class="paper-field full">
                                    <label>请求事项</label>
                                    <div class="application-fill tall" contenteditable="true" data-required="true" data-field="仲裁请求事项" data-placeholder="请分项填写，如请求退还培训费、支付违约金等。"></div>
                                </div>
                                <div class="paper-field">
                                    <label>请求金额/计算方式</label>
                                    <div class="application-fill short" contenteditable="true" data-required="true" data-field="请求金额或计算方式" data-placeholder="请输入"></div>
                                </div>
                                <div class="paper-field">
                                    <label>仲裁费用承担</label>
                                    <div class="application-fill short" contenteditable="true" data-required="true" data-field="仲裁费用承担" data-placeholder="例如由被申请人承担"></div>
                                </div>
                            </div>
                        </div>
                        <div class="paper-section">
                            <div class="paper-section-title">仲裁依据：</div>
                            <div class="paper-field-grid">
                                <div class="paper-field">
                                    <label>合同/协议名称</label>
                                    <div class="application-fill short" contenteditable="true" data-required="true" data-field="合同或协议名称" data-placeholder="请输入"></div>
                                </div>
                                <div class="paper-field full">
                                    <label>仲裁条款/仲裁协议内容</label>
                                    <div class="application-fill tall" contenteditable="true" data-required="true" data-field="仲裁条款或仲裁协议内容" data-placeholder="请填写约定提交广州仲裁委员会仲裁的条款内容。"></div>
                                </div>
                            </div>
                        </div>
                        <div class="paper-section">
                            <div class="paper-section-title">事实与理由：</div>
                            <div class="paper-field-grid">
                                <div class="paper-field">
                                    <label>合同/订单情况</label>
                                    <div class="application-fill tall" contenteditable="true" data-required="true" data-field="合同或订单情况" data-placeholder="请说明签订时间、服务内容、合同主要约定。"></div>
                                </div>
                                <div class="paper-field">
                                    <label>付款/履行情况</label>
                                    <div class="application-fill tall" contenteditable="true" data-required="true" data-field="付款或履行情况" data-placeholder="请说明付款金额、付款时间、服务履行情况。"></div>
                                </div>
                                <div class="paper-field full">
                                    <label>争议事实与沟通过程</label>
                                    <div class="application-fill tall" contenteditable="true" data-required="true" data-field="争议事实与沟通过程" data-placeholder="请说明对方违约、退款沟通、协商未果等事实。"></div>
                                </div>
                            </div>
                        </div>
                        <div class="paper-section">
                            <div class="paper-section-title">证据及证据来源：</div>
                            <div class="paper-field-grid">
                                <div class="paper-field">
                                    <label>证据名称</label>
                                    <div class="application-fill tall" contenteditable="true" data-required="true" data-field="证据名称" data-placeholder="如合同、付款凭证、聊天记录等。"></div>
                                </div>
                                <div class="paper-field">
                                    <label>证明内容</label>
                                    <div class="application-fill tall" contenteditable="true" data-required="true" data-field="证据证明内容" data-placeholder="请说明每类证据拟证明的事实。"></div>
                                </div>
                            </div>
                        </div>
                        <div class="paper-section">
                            <div class="paper-section-title no-bar">此致</div>
                            <div>广州仲裁委员会</div>
                        </div>
                        <div class="paper-sign">
                            <div class="date-line">
                                <span class="date-title">日期</span>
                                <span class="date-part"><span class="application-fill" contenteditable="true" data-required="true" data-field="落款年份" data-placeholder=""></span>年</span>
                                <span class="date-part"><span class="application-fill" contenteditable="true" data-required="true" data-field="落款月份" data-placeholder=""></span>月</span>
                                <span class="date-part"><span class="application-fill" contenteditable="true" data-required="true" data-field="落款日期" data-placeholder=""></span>日</span>
                            </div>
                        </div>
                    </article>
                    <div class="flow-action-row">
                        <button class="flow-primary-btn" type="button" data-action="confirm-application-doc">确认生成《仲裁申请书》</button>
                    </div>
                </div>
            `;
            const buildEvidenceCatalogHtml = () => `
                <div class="arbitration-flow-card" data-module="evidence-catalog">
                    <div class="flow-card-head">
                        <div>
                            <div class="flow-card-title">证据目录空白模板</div>
                            <div class="flow-card-sub">请按证据实际情况填写，目录需签字/盖章并写提交日期</div>
                        </div>
                        <div class="flow-card-status">必填</div>
                    </div>
                    <div class="catalog-template">
                        <table class="catalog-empty-table">
                            <thead>
                                <tr>
                                    <th style="width:52px;">序号</th>
                                    <th>证据名称</th>
                                    <th>证明内容</th>
                                    <th>对应请求事项</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>1</td><td></td><td></td><td></td></tr>
                                <tr><td>2</td><td></td><td></td><td></td></tr>
                                <tr><td>3</td><td></td><td></td><td></td></tr>
                                <tr><td>4</td><td></td><td></td><td></td></tr>
                            </tbody>
                        </table>
                        <div class="catalog-note">
                            填写要求：证据目录应列明证据名称、证明内容和对应请求事项；上传的证据目录需签字/盖章、写日期，日期为提交材料当日。
                        </div>
                        <div class="catalog-upload-row">
                            <div class="dialog-upload-box">
                                <div class="guide-upload-icon"><i class="fas fa-upload"></i></div>
                                <div class="dialog-upload-main">上传已签字/盖章的证据目录</div>
                                <div class="dialog-upload-sub">支持 PDF，单文件最大不超过 50MB</div>
                                <button type="button" class="dialog-upload-btn" data-action="trigger-catalog-upload">选择文件</button>
                                <input type="file" accept=".PDF" class="hidden" data-role="catalog-input" />
                            </div>
                            <div class="dialog-file-panel">
                                <div class="dialog-file-title">目录列表</div>
                                <div class="dialog-empty" data-role="catalog-file-list">尚未上传证据目录</div>
                            </div>
                        </div>
                    </div>
                    <div class="flow-action-row">
                        <button class="flow-primary-btn" type="button" data-action="confirm-evidence-catalog">已完成目录，继续上传证据材料</button>
                    </div>
                </div>
            `;
            const buildEvidenceCardHtml = (index) => `
                <div class="evidence-dialog-card" data-role="evidence-card">
                    <div class="evidence-dialog-head">
                        <div class="evidence-dialog-tag">证据${index}</div>
                        ${index > 1 ? '<button class="evidence-dialog-delete" type="button" data-action="delete-evidence-card">删除此项</button>' : ''}
                    </div>
                    <div class="evidence-dialog-upload">
                        <div class="evidence-upload-inner">
                            <div class="guide-upload-icon"><i class="fas fa-upload"></i></div>
                            <div class="dialog-upload-main">点击或拖拽上传</div>
                            <div class="dialog-upload-sub">支持 PDF，单文件最大不超过 50MB</div>
                            <button type="button" class="dialog-upload-btn" data-action="trigger-evidence-upload">选择文件</button>
                            <input type="file" accept=".PDF" multiple class="hidden" data-role="evidence-input" />
                        </div>
                        <div class="evidence-file-list" data-role="evidence-file-list">
                            <div class="dialog-empty">尚未上传证据文件</div>
                        </div>
                    </div>
                </div>
            `;
            const buildEvidenceMaterialsHtml = () => `
                <div class="arbitration-flow-card" data-module="evidence-materials">
                    <div class="flow-card-head">
                        <div>
                            <div class="flow-card-title">证据材料 <span class="guide-required">必填</span></div>
                            <div class="flow-card-sub">请将证据文件依据证明的内容，分类后上传</div>
                        </div>
                        <div class="flow-card-status">沿用线上上传规则</div>
                    </div>
                    <div class="evidence-dialog-wrap">
                        <div class="evidence-dialog-layout">
                            <div>
                                <div class="evidence-dialog-list" data-role="evidence-list">
                                    ${buildEvidenceCardHtml(1)}
                                    ${buildEvidenceCardHtml(2)}
                                </div>
                                <button class="evidence-add-more" type="button" data-action="add-evidence-card">+ 添加更多证据材料</button>
                            </div>
                            <aside class="upload-tips">
                                <div class="upload-tips-title"><i class="fas fa-circle-info" style="color:#2563eb;margin-right:4px;"></i> 上传须知</div>
                                <ol>
                                    <li><b>1</b><span>请确保证据材料清晰、完整、页码连续、无空白页。请保持单双页设置一致，切勿出现证据中一半是单页一半是双页的情况。</span></li>
                                    <li><b>2</b><span>请勿重复上传证据。</span></li>
                                    <li><b>3</b><span>提交录音证据，建议附文字整理材料。</span></li>
                                    <li><b>4</b><span>建工类案件中如果合同材料页数较多，请尽量上传完整，若实在不方便，请务必上传合同签章页、争议条款所在页以及其他与案件信息相关的重要页面。</span></li>
                                    <li><b>5</b><span>证据需附证据目录，应列明证据名称、证明内容和对应请求事项。上传的证据目录需签字/盖章、写日期（日期为提交材料当日）。</span></li>
                                    <li><b>6</b><span>请您确保上传文件的格式为 PDF、彩色、分辨率不低于300dpi、影像倾斜度小于0.5度、并保持纸质案件材料原貌，单文件最大不超过 50MB。</span></li>
                                    <li><b>7</b><span>文件名称中除后缀外，不要包含多个"."点号</span></li>
                                </ol>
                            </aside>
                        </div>
                    </div>
                </div>
            `;
            const aiPresetCards = ref([
                {
                    title: '游戏化答题',
                    desc: '通过通俗问答快速梳理纠纷事实、合同履行、退款沟通和证据缺口。',
                    icon: 'fas fa-list-check',
                    prompt: '进入游戏化答题',
                    href: './游戏化问答.html'
                },
                {
                    title: 'AI抗辩模拟',
                    desc: '提前模拟对方可能如何回应您的退款、违约或证据主张。',
                    icon: 'fas fa-comments',
                    prompt: '进入 AI 抗辩模拟',
                    href: './抗辩机器人.html'
                },
                {
                    title: '仲裁/调解路径',
                    desc: '对比调解与仲裁的办理节奏、适用场景和后续选择。',
                    icon: 'fas fa-scale-balanced',
                    prompt: '进入仲裁/调解路径',
                    href: './案件路径图.html'
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

            const currentFilingStep = computed(() => filingSteps[currentFilingStepIndex.value] || filingSteps[0]);
            const allFilingStepsCompleted = computed(() => completedFilingSteps.value.length >= filingSteps.length);

            const isProgressStepDone = (index) => {
                if (index === 0) return stage.value === 'report' || stage.value === 'enter_apply' || stage.value === 'success';
                if (index === 1) return stage.value === 'enter_apply' || stage.value === 'success';
                if (index === 2) return stage.value === 'success';
                if (index === 3) return stage.value === 'success';
                return false;
            };

            const getProgressStepClass = (index) => {
                if (isProgressStepDone(index)) return 'done';
                if (stage.value === 'ai_consult' && index === 0) return 'active';
                if (stage.value === 'report' && index === 1) return 'active';
                if (stage.value === 'enter_apply' && index === 2) return 'active';
                if (stage.value === 'success' && index === 3) return 'active';
                return 'pending';
            };

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

            const acknowledgeAiServiceNotice = () => {
                showAiServiceNotice.value = false;
            };

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
                        mediation: '选择调解',
                        arbitration: '联系客服，进行仲裁'
                    };
                    return `已选择后续处理方式：${pathLabelMap[selectedReportPath.value] || '已完成'}`;
                }
                return '请先选择下方处理方式，确认后本次立案流程即完成。';
            });
            
            const currentReportType = ref('default');

            const currentReportData = computed(() => {
                return window.getCaseAssessmentReportData(currentReportType.value);
            });

            const nextReportStep = () => {
                reportStep.value = 2;
                speak('广州仲裁委员会秉持“为每一起纠纷提供最佳解决方案”的目标愿景，在您排队等待仲裁立案的过程中，我们向您提供了一个更为快速、便捷、低成本的解决方式：调解，让您足不出户，一键解纷。点击“<span class="font-bold text-red-500">选择调解</span>”进入多元解纷调解平台。', true);
            };

            const prevReportStep = () => {
                reportStep.value = 1;
            };

            const returnToAiConsultFromReport = () => {
                stage.value = 'ai_consult';
                waitingForInteraction.value = false;
                reportStep.value = 1;
                nextTick(() => {
                    const panel = document.querySelector('.ai-scroll-content');
                    if (panel) panel.scrollTop = panel.scrollHeight;
                });
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
            const filePreviewModal = ref({
                show: false,
                file: null
            });
            const uploadedPreviewUrls = [];

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
                    confirmModal.value.title = '确认选择调解？';
                    confirmModal.value.message = '您的案件将进入快速调解通道，三个工作日内会有调解员与您联系。';
                } else if (type === 'applicationNext') {
                    confirmModal.value.title = '确认保存申请书并进入下一步？';
                    confirmModal.value.message = '确认后将保存当前仲裁申请书内容，并进入第二步材料智能提取页面。';
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
                } else if (type === 'applicationNext') {
                    closeConfirmModal();
                    applicationConfirmed.value = true;
                    finalApplicationSaved.value = true;
                    markApplicationGeneratedForStep2();
                    goToStep2FromApplicationBot();
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

            const getFileKind = (name) => {
                const ext = String(name || '').toLowerCase().split('.').pop();
                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
                return 'pdf';
            };

            const buildAttachmentItem = (file, index) => {
                const kind = getFileKind(file.name);
                const url = URL.createObjectURL(file);
                uploadedPreviewUrls.push(url);
                return {
                    id: `${Date.now()}-${index}-${file.name}`,
                    name: file.name,
                    desc: kind === 'image' ? '图片文件，点击可放大预览' : 'PDF 文件，点击可打开预览',
                    kind,
                    url,
                    raw: file
                };
            };

            const buildDemoAttachmentItem = (fileName, index) => {
                const kind = getFileKind(fileName);
                return {
                    id: `demo-${index}-${fileName}`,
                    name: fileName,
                    desc: kind === 'image' ? '图片文件，点击可放大预览' : 'PDF 文件，点击可打开预览',
                    kind,
                    url: encodeURI(`file:///Users/en/Desktop/教育培训-bot案件材料/${fileName}`)
                };
            };

            const buildDemoAttachments = (fileNames) => {
                return fileNames.map((fileName, index) => buildDemoAttachmentItem(fileName, index));
            };

            const buildRecordAttachments = (label, fileNames) => {
                return (Array.isArray(fileNames) ? fileNames : []).map((fileName, index) => ({
                    id: `record-${label}-${index}-${fileName}`,
                    name: fileName,
                    desc: label,
                    kind: getFileKind(fileName),
                    url: encodeURI(`file:///Users/en/Desktop/教育培训-bot案件材料/${fileName}`)
                }));
            };

            const openFilePreview = (file) => {
                if (!file) return;
                filePreviewModal.value = {
                    show: true,
                    file
                };
            };

            const closeFilePreview = () => {
                filePreviewModal.value = {
                    show: false,
                    file: null
                };
            };

            window.addEventListener('beforeunload', () => {
                uploadedPreviewUrls.forEach(url => URL.revokeObjectURL(url));
            });

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
                    const scroller = aiScrollBody.value || aiChatBody.value;
                    if (scroller) {
                        scroller.scrollTop = scroller.scrollHeight;
                    }
                });
            };

            const scrollAiChatToTop = () => {
                nextTick(() => {
                    const scroller = aiScrollBody.value || aiChatBody.value;
                    if (scroller) {
                        scroller.scrollTop = 0;
                    }
                });
            };
            const scrollAiChatToLatestFilingForm = () => {
                nextTick(() => {
                    const scroller = aiScrollBody.value || aiChatBody.value;
                    if (!scroller) return;
                    const rows = scroller.querySelectorAll('.filing-form-row');
                    const latest = rows[rows.length - 1];
                    if (latest && typeof latest.scrollIntoView === 'function') {
                        latest.scrollIntoView({ block: 'start', behavior: 'smooth' });
                    }
                });
            };

            const getAiTypewriter = () => {
                if (!aiTypewriter) {
                    aiTypewriter = window.createAiTypewriter({
                        messagesRef: aiMessages,
                        thinkingRef: aiIsThinking,
                        replyDelay: aiReplyDelay,
                        fallbackText: '请补充您当前卡住的步骤，我会按材料、申请书、管辖依据、请求事项和证据关系继续协助核对。',
                        nextId: () => ++aiMessageId,
                        escapeHtml,
                        scrollToBottom: scrollAiChatToBottom,
                        shouldStream: (rawText) => {
                            const html = String(rawText || '');
                            if (/<(button|a|input|textarea|select|form|table|article|section|aside|iframe)\b/i.test(html)) return false;
                            if (/(data-action|data-module|data-role|contenteditable|application-fill|flow-card|dialog-upload|evidence-dialog|arbitration-flow-card)/i.test(html)) return false;
                            return true;
                        }
                    });
                }
                return aiTypewriter;
            };
            const aiReplyHtmlToStreamText = (html) => String(html || '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/(div|p|li)>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            const clearAiReplyTimer = () => getAiTypewriter().clearReplyTimer();
            const clearAiStreamTimer = () => getAiTypewriter().clearStreamTimer();
            const withFilingStreamOptions = (streamOptions = {}) => ({
                toStreamText: aiReplyHtmlToStreamText,
                ...streamOptions
            });
            const streamAiMessage = (text, streamOptions) => getAiTypewriter().streamMessage(text, withFilingStreamOptions(streamOptions));
            const scheduleAiReply = (reply, delay = randomTextReplyDelay(), streamOptions) => getAiTypewriter().scheduleReply(reply, delay, withFilingStreamOptions(streamOptions));

            const appendAiModule = (type, html) => {
                clearAiReplyTimer();
                clearAiStreamTimer();
                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'assistant',
                    type,
                    content: html,
                    streaming: false
                });
                aiIsThinking.value = false;
                scrollAiChatToBottom();
            };
            const appendArbitrationApplication = () => {
                currentUploadContext.value = 'caseEvidence';
                appendAiModule('arbitration-application', buildArbitrationApplicationHtml());
            };
            const appendEvidenceCatalog = () => {
                currentUploadContext.value = 'caseEvidence';
                evidenceUploadStage.value = 'catalog';
            };
            const appendEvidenceMaterials = () => {
                currentUploadContext.value = 'caseEvidence';
                appendAiModule('evidence-materials', buildEvidenceMaterialsHtml());
            };
            const appendFinalApplicationReview = (sourceText = '') => {
                currentUploadContext.value = 'caseEvidence';
                finalApplicationHtml.value = sourceText
                    ? buildDemoApplicationDocumentHtml(sourceText, { editable: false })
                    : buildFinalApplicationDocumentHtml({ editable: true });
                finalApplicationSaved.value = false;
                appendAiModule('final-application-review', buildFinalApplicationReviewHtml());
            };
            const generateApplicationFromConversation = (sourceText = '') => {
                const source = String(sourceText || '').trim();
                currentUploadContext.value = 'caseEvidence';
                generatedApplicationSource.value = source;
                finalApplicationHtml.value = '';
                applicationGenerating.value = true;
                applicationGenerated.value = false;
                applicationEditable.value = false;
                finalApplicationSaved.value = false;
                applicationReady.value = true;
                aiIsThinking.value = true;
                scrollAiChatToBottom();
                window.setTimeout(() => {
                    finalApplicationHtml.value = buildDemoApplicationDocumentHtml(source, { editable: true });
                    applicationGenerating.value = false;
                    applicationGenerated.value = true;
                    applicationEditable.value = true;
                    finalApplicationSaved.value = false;
                    aiIsThinking.value = false;
                    aiMessages.value.push({
                        id: ++aiMessageId,
                        role: 'assistant',
                        content: buildAiReply({
                            lead: '仲裁申请书已生成，请在左侧文书区核对。',
                            rows: [
                                { label: '文书状态', value: '当前已进入可编辑状态。' },
                                { label: '后续操作', value: '如需修改，可直接在左侧文书区编辑；确认无误后点击“确认并下一步”。' }
                            ]
                        }),
                        streaming: false
                    });
                    scrollAiChatToBottom();
                }, randomTemplateRenderDelay());
            };
            const editGeneratedApplication = () => {
                if (!applicationGenerated.value || applicationGenerating.value) return;
                applicationEditable.value = true;
                finalApplicationHtml.value = buildDemoApplicationDocumentHtml(generatedApplicationSource.value, { editable: true });
                nextTick(() => {
                    const paper = document.querySelector('.application-paper-workbench');
                    if (paper && typeof paper.scrollIntoView === 'function') {
                        paper.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                });
            };
            const confirmGeneratedApplicationAndNext = () => {
                if (!applicationGenerated.value || applicationGenerating.value) return;
                showConfirmModal('applicationNext');
            };
            const markApplicationGeneratedForStep2 = () => {
                applicationTransferReady.value = true;
                try {
                    localStorage.setItem('filingApplicationBotGenerated', '1');
                    localStorage.setItem('filingApplicationBotGeneratedAt', new Date().toISOString());
                } catch (error) {}
            };
            const goToStep2FromApplicationBot = () => {
                markApplicationGeneratedForStep2();
                window.location.href = './Step2SmartExtraction.html?from=applicationBot';
            };
            const buildStep2TransferReply = () => buildAiReply({
                lead: '《仲裁申请书》已生成。',
                rows: [
                    { label: '处理结果', value: '申请书草稿已作为本次材料准备成果。' },
                    { label: '下一步', value: '补充案件材料。' }
                ]
            });
            const findActionTarget = (event, action) => {
                const target = event.target && event.target.closest ? event.target.closest(`[data-action="${action}"]`) : null;
                return target;
            };
            const appendUploadedFileItem = (list, fileName) => {
                if (!list) return;
                const empty = list.querySelector('.dialog-empty');
                if (empty) empty.remove();
                const item = document.createElement('div');
                item.className = 'dialog-file-item';
                item.innerHTML = `<span>${escapeHtml(fileName)}</span><span>已上传</span>`;
                list.appendChild(item);
            };
            const refreshEvidenceLabels = (root) => {
                const cards = root.querySelectorAll('[data-role="evidence-card"]');
                cards.forEach((card, index) => {
                    const tag = card.querySelector('.evidence-dialog-tag');
                    if (tag) tag.textContent = `证据${index + 1}`;
                    const head = card.querySelector('.evidence-dialog-head');
                    const oldDelete = card.querySelector('[data-action="delete-evidence-card"]');
                    if (index === 0 && oldDelete) oldDelete.remove();
                    if (index > 0 && head && !oldDelete) {
                        const btn = document.createElement('button');
                        btn.className = 'evidence-dialog-delete';
                        btn.type = 'button';
                        btn.dataset.action = 'delete-evidence-card';
                        btn.textContent = '删除此项';
                        head.appendChild(btn);
                    }
                });
            };
            const confirmFinalApplication = () => {
                applicationConfirmed.value = true;
                finishAiConsult();
            };
            const confirmFinalApplicationReview = () => {
                const module = document.querySelector('[data-module="final-application-review"]');
                const paper = document.querySelector('.application-paper-workbench');
                paper?.querySelectorAll('.missing').forEach(field => field.classList.remove('missing'));
                applicationConfirmed.value = true;
                finalApplicationSaved.value = true;
                finalReviewReady.value = false;
                markApplicationGeneratedForStep2();
                const actionRow = module && module.querySelector('.final-review-actions');
                const desc = module && module.querySelector('.application-generate-desc');
                if (desc) desc.textContent = '申请书已确认保存，可进入下一步提交案件材料。';
                if (actionRow) actionRow.remove();
                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'assistant',
                    content: buildStep2TransferReply(),
                    streaming: false
                });
                scrollAiChatToBottom();
            };
            const handleAiPanelClick = (event) => {
                if (findActionTarget(event, 'generate-final-application')) {
                    if (!aiIsThinking.value) {
                        appendFinalApplicationReview();
                    }
                    return;
                }

                if (findActionTarget(event, 'confirm-final-application-review')) {
                    confirmFinalApplicationReview();
                    return;
                }

                if (findActionTarget(event, 'confirm-application-doc')) {
                    const module = event.target.closest('[data-module="arbitration-application"]');
                    module?.querySelectorAll('.missing').forEach(field => field.classList.remove('missing'));
                    applicationConfirmed.value = true;
                    const status = module && module.querySelector('.flow-card-status');
                    if (status) status.textContent = '已生成';
                    markApplicationGeneratedForStep2();
                    aiMessages.value.push({
                        id: ++aiMessageId,
                        role: 'assistant',
                        content: buildStep2TransferReply(),
                        streaming: false
                    });
                    return;
                }

                const catalogUploadBtn = findActionTarget(event, 'trigger-catalog-upload');
                if (catalogUploadBtn) {
                    const module = catalogUploadBtn.closest('[data-module="evidence-catalog"]');
                    const input = module && module.querySelector('[data-role="catalog-input"]');
                    if (input) input.click();
                    return;
                }

                if (findActionTarget(event, 'confirm-evidence-catalog')) {
                    aiMessages.value.push({
                        id: ++aiMessageId,
                        role: 'assistant',
                        content: buildAiReply({
                            lead: '证据目录已进入材料准备流程。下一步请按目录逐项上传<strong>证据材料</strong>。',
                            rows: [
                                { label: '上传方式', value: '每一项证据单独上传，避免目录和材料无法对应。' },
                                { label: '格式规则', value: '证据材料沿用线上立案页面规则：PDF、清晰、完整、页码连续。' }
                            ]
                        }),
                        streaming: false
                    });
                    appendEvidenceMaterials();
                    return;
                }

                const evidenceUploadBtn = findActionTarget(event, 'trigger-evidence-upload');
                if (evidenceUploadBtn) {
                    const card = evidenceUploadBtn.closest('[data-role="evidence-card"]');
                    const input = card && card.querySelector('[data-role="evidence-input"]');
                    if (input) input.click();
                    return;
                }

                const addEvidenceBtn = findActionTarget(event, 'add-evidence-card');
                if (addEvidenceBtn) {
                    const module = addEvidenceBtn.closest('[data-module="evidence-materials"]');
                    const list = module && module.querySelector('[data-role="evidence-list"]');
                    if (!list) return;
                    const nextIndex = list.querySelectorAll('[data-role="evidence-card"]').length + 1;
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = buildEvidenceCardHtml(nextIndex);
                    list.appendChild(wrapper.firstElementChild);
                    refreshEvidenceLabels(module);
                    return;
                }

                const deleteEvidenceBtn = findActionTarget(event, 'delete-evidence-card');
                if (deleteEvidenceBtn) {
                    const module = deleteEvidenceBtn.closest('[data-module="evidence-materials"]');
                    const card = deleteEvidenceBtn.closest('[data-role="evidence-card"]');
                    if (card) card.remove();
                    if (module) refreshEvidenceLabels(module);
                }
            };
            const handleAiPanelInput = (event) => {
                const target = event.target;
                if (!target || !target.closest || !target.closest('[data-module="arbitration-application"], [data-module="final-application-review"]')) return;
                if (target.matches && target.matches('[data-required="true"]')) target.classList.remove('missing');
                if (applicationConfirmed.value) {
                    applicationConfirmed.value = false;
                    const module = target.closest('[data-module="arbitration-application"]');
                    const status = module && module.querySelector('.flow-card-status');
                    if (status) status.textContent = '待申请人确认';
                }
            };
            const recordEvidenceCatalogUpload = (fileNames) => {
                const names = Array.isArray(fileNames) ? fileNames.filter(Boolean) : [];
                if (!names.length) return;
                aiAttachmentName.value = names.join('、');
                evidenceCatalogFiles.value = Array.from(new Set([
                    ...evidenceCatalogFiles.value,
                    ...names
                ]));
                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'user',
                    content: '',
                    attachments: buildRecordAttachments('证据目录', names),
                    streaming: false
                });
                evidenceUploadStage.value = 'evidence';
                aiIsThinking.value = true;
                scrollAiChatToBottom();
                scheduleAiReply(buildAiReply({
                    lead: '已记录<strong>证据目录</strong>。',
                    rows: [
                        { label: '后续上传', value: '请按证据目录逐组上传证据材料。' },
                        { label: '批次规则', value: '每次通过附件按钮选择的一个或多个文件，都会作为同一证据组记录。' },
                        { label: '继续补充', value: '如需上传下一组，请再次点击附件按钮。' }
                    ],
                    note: '证据材料需与证据目录保持对应，最终以仲裁委正式审核结果为准。'
                }), randomUploadReplyDelay());
            };
            const recordEvidenceGroupUpload = (fileNames) => {
                const names = Array.isArray(fileNames) ? fileNames.filter(Boolean) : [];
                if (!names.length) return;
                aiAttachmentName.value = names.join('、');
                const groupNumber = evidenceGroups.value.length + 1;
                evidenceGroups.value = [
                    ...evidenceGroups.value,
                    {
                        index: groupNumber,
                        files: names
                    }
                ];
                finalReviewReady.value = true;
                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'user',
                    content: '',
                    attachments: buildRecordAttachments(`证据组${groupNumber}`, names),
                    streaming: false
                });
                aiIsThinking.value = true;
                scrollAiChatToBottom();
                scheduleAiReply(buildAiReply({
                    lead: `已记录<strong>证据组${groupNumber}</strong>。`,
                    rows: [
                        { label: '本组文件', value: aiAttachmentName.value },
                        { label: '后续操作', value: '可继续点击附件按钮上传下一证据组。' },
                        { label: '完成提交', value: '确认目录和材料已补充完成后，可点击页面右下角生成案件评估报告。' }
                    ]
                }), randomUploadReplyDelay());
            };
            const handleAiPanelChange = (event) => {
                const input = event.target;
                if (!input || input.type !== 'file') return;
                const files = Array.from(input.files || []);
                if (!files.length) return;
                const catalogModule = input.closest('[data-module="evidence-catalog"]');
                if (catalogModule) {
                    const list = catalogModule.querySelector('[data-role="catalog-file-list"]');
                    files.forEach(file => appendUploadedFileItem(list, file.name));
                    input.value = '';
                    return;
                }
                const evidenceCard = input.closest('[data-role="evidence-card"]');
                if (evidenceCard) {
                    const list = evidenceCard.querySelector('[data-role="evidence-file-list"]');
                    files.forEach(file => appendUploadedFileItem(list, file.name));
                    input.value = '';
                }
            };
            const setAiStaticGreeting = () => {
                applicationConfirmed.value = false;
                applicationReady.value = false;
                applicationTransferReady.value = false;
                finalApplicationHtml.value = '';
                finalApplicationSaved.value = false;
                applicationGenerating.value = false;
                applicationGenerated.value = false;
                applicationEditable.value = false;
                generatedApplicationSource.value = '';
                finalReviewReady.value = false;
                evidenceUploadStage.value = 'none';
                evidenceCatalogFiles.value = [];
                evidenceGroups.value = [];
                conversationStepIndex.value = 0;
                applicationDraft.value = {
                    applicant: '',
                    respondent: '',
                    claims: '',
                    facts: '',
                    evidence: ''
                };
                currentUploadContext.value = 'caseEvidence';
                conversationStepIndex.value = 0;
                aiMessages.value = [
                    {
                        id: ++aiMessageId,
                        role: 'assistant',
                        content: buildAiReply({
                            lead: '您好,欢迎来到广州仲裁委员会,我将根据您的口述信息和上传的证据材料,协助生成仲裁申请书初稿。\n\n为保证申请书内容完整,我们会依次梳理以下内容:\n1.申请人及被申请人主体信息;\n2.仲裁条款;\n3.仲裁请求及金额;\n4.合同履行相关情况;\n5.证据材料。\n请您先简单说明:本案大致是什么纠纷?例如培训退费、服务合同、借款、买卖合同等。',
                            rows: [
                                { label: '当前步骤', value: '请先说明纠纷类型。' }
                            ]
                        }),
                        streaming: false
                    }
                ];
                aiIsThinking.value = false;
                scrollAiChatToTop();
            };

            const startAiConsult = () => {
                waitingForInteraction.value = false;
                showDialog.value = false;
                aiInput.value = '';
                aiAttachmentName.value = '';
                currentUploadContext.value = 'general';
                evidenceUploadStage.value = 'none';
                evidenceCatalogFiles.value = [];
                evidenceGroups.value = [];
                applicationConfirmed.value = false;
                applicationReady.value = false;
                finalApplicationHtml.value = '';
                finalApplicationSaved.value = false;
                applicationGenerating.value = false;
                applicationGenerated.value = false;
                applicationEditable.value = false;
                generatedApplicationSource.value = '';
                finalReviewReady.value = false;
                conversationStepIndex.value = 0;
                aiMessageId = 0;
                aiMessages.value = [];
                aiIsThinking.value = true;
                stage.value = 'ai_consult';
                scrollAiChatToBottom();
                setAiStaticGreeting();
            };

            const inferUploadContext = (text) => {
                const normalized = String(text || '').replace(/\s/g, '');
                if (normalized.includes('送达') || normalized.includes('确认书') || normalized.includes('开票')) return 'delivery';
                if (normalized.includes('被申请人') || normalized.includes('对方') || normalized.includes('人口信息') || normalized.includes('营业执照')) return 'respondent';
                if (normalized.includes('申请人') || normalized.includes('代理人') || normalized.includes('授权委托') || normalized.includes('身份证')) return 'applicant';
                if (normalized.includes('证据') || normalized.includes('合同') || normalized.includes('签章') || normalized.includes('仲裁条款') || normalized.includes('申请书') || normalized.includes('付款') || normalized.includes('违约金') || normalized.includes('金额') || normalized.includes('管辖')) return 'caseEvidence';
                return 'general';
            };

            const getAiReply = (question) => {
                const normalized = question.replace(/\s/g, '');
                if (normalized.includes('材料') || normalized.includes('准备') || normalized.includes('立案')) {
                    currentUploadContext.value = 'applicant';
                    return buildAiReply({
                        lead: '建议先按<strong>材料完整性</strong>核对。',
                        rows: [
                            { label: '必备材料', value: '仲裁申请书、申请人身份证明或主体材料、被申请人主体信息。' },
                            { label: '管辖材料', value: '合同、订单、平台协议或其他包含仲裁条款的文件。' },
                            { label: '证据材料', value: '付款凭证、沟通记录、履行记录、证据目录。' }
                        ],
                        steps: [
                            '先确认材料是否齐全。',
                            '再检查每份材料是否清晰、完整。',
                            '最后确认每项请求都有对应证据。'
                        ]
                    });
                }
                if (normalized.includes('申请书') || normalized.includes('事实理由') || normalized.includes('主体信息')) {
                    currentUploadContext.value = 'caseEvidence';
                    return buildAiReply({
                        lead: '申请书建议重点核对<strong>五项内容</strong>。',
                        rows: [
                            { label: '主体信息', value: '申请人、被申请人名称和身份信息是否准确。' },
                            { label: '仲裁请求', value: '请求事项是否逐项写清楚，金额是否明确。' },
                            { label: '事实理由', value: '事实经过是否能支撑请求事项。' },
                            { label: '证据清单', value: '证据名称、证明目的和对应请求事项是否一致。' }
                        ],
                        note: '<strong>注意：</strong>AI 可以辅助生成草稿，但申请人必须确认内容真实、准确、完整后再提交。'
                    });
                }
                if (normalized.includes('管辖') || normalized.includes('仲裁条款') || normalized.includes('仲裁协议')) {
                    currentUploadContext.value = 'caseEvidence';
                    return buildAiReply({
                        lead: '管辖依据请优先查<strong>合同或协议中的仲裁条款</strong>。',
                        rows: [
                            { label: '查找位置', value: '合同、订单、平台协议、补充协议。' },
                            { label: '核对重点', value: '仲裁机构、争议范围、当事人是否明确。' },
                            { label: '材料建议', value: '上传含仲裁条款的页面或协议截图。' },
                            { label: '风险', value: '找不到明确条款时，建议先补充材料或人工核对。' }
                        ]
                    });
                }
                if (normalized.includes('请求') || normalized.includes('证据') || normalized.includes('对应')) {
                    currentUploadContext.value = 'caseEvidence';
                    return buildAiReply({
                        lead: '每一项仲裁请求都应有<strong>对应证据</strong>。',
                        rows: [
                            { label: '退款请求', value: '合同、付款凭证、退款沟通记录。' },
                            { label: '违约金请求', value: '违约责任条款、违约事实证据。' },
                            { label: '利息请求', value: '起算时间、利率依据、计算过程。' }
                        ],
                        steps: [
                            '先列请求事项。',
                            '再写每项请求要证明什么。',
                            '最后上传对应证据。'
                        ]
                    });
                }
                if (normalized.includes('金额') || normalized.includes('付款') || normalized.includes('违约金') || normalized.includes('利息') || normalized.includes('退款')) {
                    currentUploadContext.value = 'caseEvidence';
                    return buildAiReply({
                        lead: '金额类请求需要同时核对<strong>来源、凭证、计算依据</strong>。',
                        rows: [
                            { label: '金额来源', value: '合同约定、订单、报价单、补充协议。' },
                            { label: '支付凭证', value: '银行流水、转账记录、发票、收据。' },
                            { label: '计算依据', value: '退款比例、违约金条款、利息起算时间。' }
                        ],
                        note: '系统会重点提示金额是否缺少<strong>计算明细</strong>。'
                    });
                }
                if (normalized.includes('OCR') || normalized.includes('提取') || normalized.includes('识别') || normalized.includes('AI')) {
                    currentUploadContext.value = 'caseEvidence';
                    return buildAiReply({
                        lead: 'AI 提取只用于<strong>辅助填写和核对</strong>，不等于事实已被确认。',
                        rows: [
                            { label: '可辅助提取', value: '合同主体、签署时间、争议条款、付款金额、沟通承诺。' },
                            { label: '必须人工确认', value: '提取内容是否与原文一致，是否需要修正。' }
                        ],
                        steps: [
                            '先看原文。',
                            '再看 AI 提取结果。',
                            '发现错误时手动修改。'
                        ]
                    });
                }
                if (normalized.includes('风险') || normalized.includes('补正') || normalized.includes('退回')) {
                    currentUploadContext.value = 'general';
                    return buildAiReply({
                        lead: '提交前常见风险主要集中在<strong>管辖、证据、金额、主体信息</strong>。',
                        rows: [
                            { label: '管辖风险', value: '仲裁条款或仲裁协议不明确。' },
                            { label: '证据风险', value: '请求事项与证据不匹配。' },
                            { label: '金额风险', value: '计算依据不足或缺少支付凭证。' },
                            { label: '信息风险', value: '主体信息不准确，AI 提取内容未核对。' }
                        ],
                        note: '建议先补齐关键材料，再进入后续提交。'
                    });
                }
                return buildAiReply({
                    lead: '我会按立案提交前核对逻辑协助您。',
                    rows: [
                        { label: '可询问方向', value: '申请书准备、管辖依据、请求事项、事实理由、材料提交规则。' },
                        { label: '建议输入', value: '直接说明您现在卡在哪一步，或贴出您想核对的问题。' }
                    ],
                    note: '请尽量描述具体材料或争议点，我会按立案核对逻辑继续协助。'
                });
            };

            const recordConversationAnswer = (text) => {
                const field = conversationFields[conversationStepIndex.value] || conversationFields[conversationFields.length - 1];
                const previous = applicationDraft.value[field.key];
                const nextValue = previous && String(previous).trim()
                    ? `${previous}\n${text}`
                    : text;
                applicationDraft.value = {
                    ...applicationDraft.value,
                    [field.key]: nextValue
                };
                currentUploadContext.value = field.context || inferUploadContext(text);
                return field;
            };

            const isRelevantConversationAnswer = (field, text) => {
                const normalized = String(text || '').replace(/\s/g, '');
                if (!normalized) return false;
                if (/暂不清楚|不知道|不确定|没有|暂无/.test(normalized)) return true;
                const keywords = Array.isArray(field.keywords) ? field.keywords : [];
                if (keywords.some(keyword => normalized.includes(keyword))) return true;
                if (field.key === 'applicant') return /\d{7,}|1\d{10}/.test(normalized);
                if (field.key === 'respondent') return /公司|机构|个人|企业|[0-9A-Z]{8,}/.test(normalized);
                if (field.key === 'claims') return /\d+(\.\d+)?元/.test(normalized);
                if (field.key === 'facts') return /\d{4}年|\d{1,2}月|\d{1,2}日/.test(normalized);
                return false;
            };

            const buildStayOnCurrentFieldReply = (field) => {
                currentUploadContext.value = field.context || 'general';
                return buildAiReply({
                    lead: field.expected === 'upload'
                        ? `请先上传${field.label}相关材料，便于继续识别并生成申请书。`
                        : '这个问题后面可以再处理。为了先帮您生成申请书，请先围绕当前问题补充信息。',
                    rows: [
                        { label: '建议这样填写', value: field.key === 'applicant' ? '例如：申请人张三，身份证号……，电话……，地址……。' : '请围绕当前问题补充，暂不清楚的内容可以先写“暂不清楚”。' }
                    ]
                });
            };

            const buildNextCollectionReply = (field, text) => {
                if (field.final) {
                    applicationReady.value = true;
                    currentUploadContext.value = 'caseEvidence';
                    return buildAiReply({
                        lead: '材料已基本完整，可以生成仲裁申请书初稿。',
                        rows: [
                            { label: '生成范围', value: '当事人信息、仲裁请求、事实理由、仲裁依据和证据目录。' },
                            { label: '后续操作', value: '点击下方按钮后，申请书将在左侧模板区生成，并支持编辑确认。' }
                        ],
                        note: '<button class="flow-primary-btn" type="button" data-action="generate-final-application">生成申请书</button>'
                    });
                }
                const nextIndex = conversationStepIndex.value + 1;
                if (nextIndex < conversationFields.length) {
                    const nextField = conversationFields[nextIndex];
                    conversationStepIndex.value = nextIndex;
                    currentUploadContext.value = nextField.context || 'general';
                    return buildAiReply({ lead: field.reply || `好的，已记录。请继续补充${nextField.label}。` });
                }
                applicationReady.value = true;
                currentUploadContext.value = 'caseEvidence';
                return buildAiReply({
                    lead: '材料已基本完整，可以生成仲裁申请书初稿。',
                    note: '<button class="flow-primary-btn" type="button" data-action="generate-final-application">生成申请书</button>'
                });
            };

            const sendAiMessage = () => {
                const text = aiInput.value.trim();
                if (!text || aiIsThinking.value) return;
                clearAiStreamTimer();

                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'user',
                    content: escapeHtml(text),
                    streaming: false
                });
                aiInput.value = '';
                aiIsThinking.value = true;
                scrollAiChatToBottom();

                if (stage.value === 'ai_consult' && !finalApplicationSaved.value) {
                    generateApplicationFromConversation(text);
                    return;
                }

                if (!applicationReady.value) {
                    const currentField = conversationFields[conversationStepIndex.value] || conversationFields[conversationFields.length - 1];
                    if (!isRelevantConversationAnswer(currentField, text)) {
                        scheduleAiReply(() => buildStayOnCurrentFieldReply(currentField), randomTextReplyDelay());
                        return;
                    }
                    const recordedField = recordConversationAnswer(text);
                    scheduleAiReply(
                        () => buildNextCollectionReply(recordedField, text),
                        recordedField.final ? randomTemplateRenderDelay() : randomTextReplyDelay()
                    );
                    return;
                }

                currentUploadContext.value = inferUploadContext(text);
                scheduleAiReply(() => getAiReply(text), randomTextReplyDelay());
            };

            const playDemoNextStep = () => {
                if (aiIsThinking.value) return;
                if (applicationTransferReady.value) {
                    goToStep2FromApplicationBot();
                    return;
                }
                if (stage.value === 'ai_consult') {
                    goToStep2FromApplicationBot();
                    return;
                }
                if (applicationReady.value) {
                    if (!finalApplicationHtml.value) {
                        appendFinalApplicationReview();
                    } else if (!finalApplicationSaved.value) {
                        confirmFinalApplicationReview();
                    }
                    return;
                }
                const currentField = conversationFields[conversationStepIndex.value];
                if (!currentField) return;
                aiInput.value = currentField.demo || filingDemoAnswers[currentField.key] || `${currentField.label}：暂按演示材料补充。`;
                sendAiMessage();
            };
            const autoFillApplicationTemplate = () => {
                if (aiIsThinking.value) return;
                applicationReady.value = true;
                applicationTransferReady.value = false;
                applicationConfirmed.value = false;
                finalApplicationHtml.value = '';
                finalApplicationSaved.value = false;
                applicationGenerating.value = false;
                applicationGenerated.value = false;
                applicationEditable.value = false;
                generatedApplicationSource.value = '';
                finalReviewReady.value = false;
                currentUploadContext.value = 'caseEvidence';
                const exists = document.querySelector('[data-module="final-application-review"]');
                if (!exists) {
                    aiIsThinking.value = true;
                    scrollAiChatToBottom();
                    scheduleAiReply(() => {
                        appendFinalApplicationReview();
                        return '';
                    }, randomTemplateRenderDelay(), { stream: false });
                    return;
                }
                scrollAiChatToBottom();
            };

            const chooseAiPreset = (card) => {
                if (aiIsThinking.value) return;
                if (card.href) {
                    try {
                        localStorage.setItem('filingDemoAuxReturn', 'report');
                    } catch (error) {}
                    window.location.href = card.href;
                    return;
                }
                clearAiStreamTimer();
                currentUploadContext.value = card.uploadContext || inferUploadContext(card.prompt);
                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'user',
                    content: escapeHtml(card.prompt),
                    streaming: false
                });
                aiInput.value = '';
                aiIsThinking.value = true;
                scrollAiChatToBottom();

                scheduleAiReply(card.answer, randomTextReplyDelay());
            };

            const triggerAiFileUpload = () => {
                if (aiFileInput.value) {
                    aiFileInput.value.click();
                }
            };

            const triggerUploadBlock = (blockId) => {
                currentUploadContext.value = 'caseEvidence';
                triggerAiFileUpload();
            };

            const handleAiFileChange = (event) => {
                const files = Array.from(event.target.files || []);
                if (!files.length || aiIsThinking.value) return;
                clearAiStreamTimer();
                aiAttachmentName.value = files.map(file => file.name).join('、');
                const attachments = files.map((file, index) => buildAttachmentItem(file, index));

                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'user',
                    content: '',
                    attachments,
                    streaming: false
                });
                aiIsThinking.value = true;
                scrollAiChatToBottom();

                if (!applicationReady.value) {
                    const currentField = conversationFields[conversationStepIndex.value] || conversationFields[conversationFields.length - 1];
                    if (currentField && currentField.expected === 'upload') {
                        const recordedField = recordConversationAnswer(`已上传${currentField.label}：${aiAttachmentName.value}`);
                        scheduleAiReply(
                            () => buildNextCollectionReply(recordedField, aiAttachmentName.value),
                            recordedField.final ? randomTemplateRenderDelay() : randomUploadReplyDelay()
                        );
                        event.target.value = '';
                        return;
                    }
                }

                scheduleAiReply(buildAiReply({
                    lead: '已记录您上传的材料。',
                    rows: [
                        { label: '当前上传规则', value: currentUploadRule.value.text.replace(/<[^>]+>/g, '') },
                        { label: '核对重点', value: '请确认材料内容清晰、完整，并与当前问题相关。' }
                    ],
                    note: '如已进入证据上传环节，请按系统提示提交证据目录和证据材料。'
                }), randomUploadReplyDelay());
                event.target.value = '';
            };

            const selectFilingStep = (index) => {
                if (index < 0 || index >= filingSteps.length || aiIsThinking.value) return;
                currentFilingStepIndex.value = index;
                clearAiStreamTimer();
                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'user',
                    content: escapeHtml(`切换到${filingSteps[index].title}`),
                    streaming: false
                });
                aiIsThinking.value = true;
                scrollAiChatToBottom();
                scheduleAiReply(buildAiReply({
                    lead: filingSteps[index].prompt,
                    rows: [
                        { label: '线上字段', value: `已进入${filingSteps[index].fullName}核对。` },
                        { label: '确认动作', value: '请按原线上页面要求保存或填写，再继续下一步。' }
                    ],
                    steps: filingSteps[index].risks,
                    note: '<strong>提示：</strong>字段结构沿用已上线立案页面。'
                }));
            };

            const goPrevFilingStep = () => {
                if (currentFilingStepIndex.value > 0) {
                    selectFilingStep(currentFilingStepIndex.value - 1);
                }
            };

            const saveFilingDraft = () => {
                try {
                    localStorage.setItem('filingBotDraftStep', String(currentFilingStepIndex.value));
                    localStorage.setItem('filingBotDraftSavedAt', new Date().toISOString());
                } catch (error) {}
                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'assistant',
                    content: buildAiReply({
                        lead: '当前步骤已保存为<strong>申请草稿</strong>。',
                        rows: [
                            { label: '保存范围', value: '已记录当前办理阶段和页面状态提示。' },
                            { label: '正式系统', value: '应保存结构化字段、附件索引、AI 提取结果和核对状态。' }
                        ]
                    }),
                    streaming: false
                });
                scrollAiChatToBottom();
            };

            const onFilingFrameLoad = (event) => {
                try {
                    const doc = event.target.contentDocument;
                    if (!doc) return;
                    const style = doc.createElement('style');
                    style.textContent = `
                        .step-nav, .step-nav-wrapper, .footer-actions { display: none !important; }
                        body { padding-bottom: 24px !important; }
                    `;
                    doc.head.appendChild(style);
                } catch (error) {}
            };

            const confirmCurrentFilingStep = () => {
                const index = currentFilingStepIndex.value;
                try {
                    const frame = document.querySelector('.filing-step-frame');
                    const frameWindow = frame && frame.contentWindow;
                    if (frameWindow && typeof frameWindow.validateAll === 'function') {
                        const valid = frameWindow.validateAll(true);
                        if (!valid) return;
                    }
                } catch (error) {}

                if (!completedFilingSteps.value.includes(index)) {
                    completedFilingSteps.value = [...completedFilingSteps.value, index].sort((a, b) => a - b);
                }

                aiMessages.value.push({
                    id: ++aiMessageId,
                    role: 'assistant',
                    content: buildAiReply({
                        lead: `<strong>${filingSteps[index].title}</strong>已完成本轮核对。`,
                        rows: [
                            { label: '完成状态', value: '该步骤已标记为已确认。' },
                            { label: '下一步', value: index < filingSteps.length - 1 ? `进入${filingSteps[index + 1].title}继续核对。` : '在线立案填写已完成，可进入案件评估报告。' }
                        ],
                        note: '请注意，当前确认不代表仲裁委正式审核通过。'
                    }),
                    streaming: false
                });
                scrollAiChatToBottom();

                if (index < filingSteps.length - 1) {
                    currentFilingStepIndex.value = index + 1;
                    scheduleAiReply(buildAiReply({
                        lead: filingSteps[index + 1].prompt,
                        rows: [
                            { label: '当前步骤', value: filingSteps[index + 1].fullName },
                            { label: '操作建议', value: '先核对 AI 提取结果，再补充缺失字段和附件。' }
                        ],
                        steps: filingSteps[index + 1].risks
                    }), 450);
                }
            };

            const finishAiConsult = () => {
                aiIsThinking.value = false;
                clearAiReplyTimer();
                clearAiStreamTimer();
                try {
                    const completed = JSON.parse(localStorage.getItem('filingDemoCompletedPaths') || '{}');
                    completed.defense = true;
                    localStorage.setItem('filingDemoCompletedPaths', JSON.stringify(completed));
                } catch (error) {
                    localStorage.setItem('filingDemoCompletedPaths', JSON.stringify({ defense: true }));
                }
                localStorage.setItem('filingDemoOpenReport', 'filingBot');
                reportStep.value = 1;
                stage.value = 'report';
                waitingForInteraction.value = false;
                speak("这是为您生成的案件评估报告，请查阅。", true);
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
                window.location.href = './申请书bot.html';
            };

            const contactService = () => {
                waitingForInteraction.value = false;
                if (!isFilingCompleted.value) {
                    markFilingCompleted('arbitration');
                }
                try {
                    localStorage.setItem('filingDemoOpenReport', 'arbitration');
                } catch (error) {}
                window.location.href = './立案提交后路径选择.html';
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
                location.reload();
            };

            const isDemoConfigOn = (value) => value === 1 || value === '1' || value === true;
            const syncApplicationDemoButtonConfig = (config = {}) => {
                const demoStepValue = Object.prototype.hasOwnProperty.call(config, 'isShowApplicationDemoStepBtn')
                    ? config.isShowApplicationDemoStepBtn
                    : localStorage.getItem('isShowApplicationDemoStepBtn');
                const autoFillValue = Object.prototype.hasOwnProperty.call(config, 'isShowApplicationAutoFillBtn')
                    ? config.isShowApplicationAutoFillBtn
                    : localStorage.getItem('isShowApplicationAutoFillBtn');
                showApplicationDemoStepButton.value = isDemoConfigOn(demoStepValue);
                showApplicationAutoFillButton.value = isDemoConfigOn(autoFillValue);
            };

            syncApplicationDemoButtonConfig(window.FilingDemoConfig?.load?.());
            window.addEventListener('filing-demo-config-ready', event => syncApplicationDemoButtonConfig(event.detail || {}));
            window.addEventListener('filing-demo-config-change', event => syncApplicationDemoButtonConfig(event.detail || {}));

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
                aiAttachmentName.value = '';
                aiMessageId = 0;
                aiIsThinking.value = false;
                clearAiReplyTimer();
                clearAiStreamTimer();
                const shouldOpenReport = (() => {
                    try {
                        const flag = localStorage.getItem('filingDemoOpenReport') || '';
                        return flag === 'auxTool' || flag === 'filingBot';
                    } catch (error) {
                        return false;
                    }
                })();
                if (shouldOpenReport) {
                    try {
                        localStorage.removeItem('filingDemoOpenReport');
                        localStorage.removeItem('filingDemoAuxReturn');
                    } catch (error) {}
                    reportStep.value = 1;
                    stage.value = 'report';
                    waitingForInteraction.value = false;
                    return;
                }
                setAiStaticGreeting();
            });

            return {
                npcImage, mapImage,
                stage, subStage, showDialog, showAiServiceNotice, acknowledgeAiServiceNotice, waitingForInteraction,
                displayedText, isTyping, handleDialogClick,
                mapPoints, questions, currentMapNodeIndex,
                showOverlayPanel,
                filingProgressSteps, filingSteps, currentFilingStepIndex, currentFilingStep,
                completedFilingSteps, allFilingStepsCompleted,
                isProgressStepDone, getProgressStepClass,
                selectFilingStep, goPrevFilingStep, saveFilingDraft,
                confirmCurrentFilingStep, onFilingFrameLoad,
                openPointsPage,
                currentQuestion, currentQuestionIndex, answerQuestion, prevQuestion,
                choosePath, finalDest, resetGame,
                applyChannel, submitFinalApply, pathLength, pathOffset,
                analysisData, filingMeta, confirmAnalysis,
                showCaseTypeBadge, scorePopups, contactService,
                showVideoModal, videoSrc, videoSpeed, videoPlayer, setVideoSpeed, closeVideo,
                filePreviewModal, openFilePreview, closeFilePreview,
                aiInput, aiMessages, aiPresetCards, aiIsThinking, aiScrollBody, aiChatBody, aiFileInput, aiAttachmentName,
                currentUploadRule, currentUploadContext, isCurrentUploadStep, applicationConfirmed, applicationReady, applicationTransferReady,
                applicationTemplateHtml, finalApplicationHtml, finalApplicationSaved,
                applicationGenerating, applicationGenerated, applicationEditable,
                showApplicationDemoStepButton, showApplicationAutoFillButton,
                showFloatingFinalReportButton,
                sendAiMessage, playDemoNextStep, autoFillApplicationTemplate, chooseAiPreset, triggerAiFileUpload, triggerUploadBlock, handleAiFileChange, finishAiConsult,
                confirmFinalApplication, goToStep2FromApplicationBot, editGeneratedApplication, confirmGeneratedApplicationAndNext,
                handleAiPanelClick, handleAiPanelChange, handleAiPanelInput,
                confirmModal, showConfirmModal, closeConfirmModal, executeConfirmAction,
                score, badges, earnedBadges, toggleBadgeDrawer, isBadgeDrawerOpen,
                reportStep, nextReportStep, prevReportStep, returnToAiConsultFromReport,
                isFilingCompleted, selectedReportPath,
                filingStatusTitle, filingStatusDesc,
                currentReportType, currentReportData,
                newBadgeCount, currentMilestone, flyingScores, scoreDisplay, scoreAnimate
            };
        }
    })
    .component('case-assessment-report', window.CaseAssessmentReport)
    .mount('#app');
