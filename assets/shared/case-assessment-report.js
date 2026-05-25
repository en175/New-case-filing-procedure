window.CaseAssessmentReport = {
    props: {
        reportStep: {
            type: Number,
            required: true
        },
        reportData: {
            type: Object,
            required: true
        },
        isFilingCompleted: {
            type: Boolean,
            default: false
        },
        showBackButton: {
            type: Boolean,
            default: false
        },
        mediationLabel: {
            type: String,
            default: '参与调解'
        },
        pptDemoMode: {
            type: Boolean,
            default: false
        }
    },
    emits: ['back', 'next', 'prev', 'confirm'],
    template: `
        <div class="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col animate__animated animate__zoomIn mt-8" :class="{ 'report-ppt-demo-card': pptDemoMode }" :style="pptDemoMode ? null : 'max-height: calc(100vh - 120px);'">
            <div class="px-6 pt-8 pb-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 rounded-t-2xl">
                <div class="flex items-center gap-3">
                    <button type="button" v-if="showBackButton" @click="$emit('back')" class="report-back-btn" aria-label="上一步">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2 class="text-2xl font-bold text-slate-800">案件评估报告</h2>
                </div>
                <div class="text-sm text-slate-400">报告生成时间：{{ new Date().toLocaleDateString() }}</div>
            </div>

            <div v-if="!isFilingCompleted" class="report-top-status-bar">
                <i class="fas fa-exclamation-circle" style="color:#d97706;font-size:18px;flex-shrink:0;"></i>
                <span>最后一步：阅读完毕后请在底部选择您的后续路径。</span>
            </div>

            <div :class="pptDemoMode ? 'p-8 space-y-8 bg-slate-50' : 'flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50 custom-scrollbar'">
                <div v-if="reportStep === 1" class="space-y-8 animate__animated animate__fadeIn">
                    <div class="bg-red-50/50 rounded-2xl p-6 border border-red-100">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center">
                                <div class="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center mr-3 shadow-sm">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <h3 class="text-xl font-bold text-slate-800">评估分析</h3>
                            </div>
                        </div>

                        <div v-if="!pptDemoMode" class="flex flex-col items-center mb-8">
                            <div class="text-6xl font-bold text-orange-500 mb-2">{{ reportData.success_probability_min }}% - {{ reportData.success_probability_max }}%</div>
                            <div class="text-sm text-orange-400 font-medium">评估分析（{{ reportData.risk_level }}，基于智能数据进行分析，仅供参考）</div>
                        </div>

                        <div class="bg-white/80 rounded-xl p-6 border border-red-100 shadow-sm mb-6 transition-all duration-300">
                            <h4 class="font-bold text-slate-700 mb-4">评估分析：</h4>
                            <div v-if="reportData.risk_overview_html" class="text-sm text-slate-600 leading-relaxed mb-6 space-y-4" v-html="reportData.risk_overview_html"></div>
                            <p v-else class="text-sm text-slate-600 leading-relaxed mb-6">{{ reportData.risk_overview }}</p>

                            <h4 class="font-bold text-slate-700 mb-4 mt-6 border-t pt-4">有利因素：</h4>
                            <div class="space-y-4 text-sm text-slate-600 leading-relaxed">
                                <div v-for="(factor, index) in reportData.favorable_factors" :key="'fav-' + index">
                                    <strong class="text-slate-800 block mb-1">{{ factor.title }}</strong>
                                    {{ factor.description }}
                                </div>
                            </div>

                            <h4 class="font-bold text-slate-700 mb-4 mt-6 border-t pt-4">不利因素：</h4>
                            <div class="space-y-4 text-sm text-slate-600 leading-relaxed">
                                <div v-for="(factor, index) in reportData.unfavorable_factors" :key="'unfav-' + index">
                                    <strong class="text-slate-800 block mb-1">{{ factor.title }}</strong>
                                    {{ factor.description }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="bg-purple-50 rounded-2xl p-6 shadow-sm border border-purple-100 flex flex-col">
                            <div class="flex items-center mb-6">
                                <div class="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center mr-3">
                                    <i class="fas fa-gavel"></i>
                                </div>
                                <h3 class="text-xl font-bold text-slate-800">司法判例参考</h3>
                            </div>
                            <div class="bg-white/60 rounded-xl p-5 mb-4 flex-1">
                                <div class="text-sm font-bold text-slate-700 mb-2">相似案例参考</div>
                                <div class="text-sm text-slate-600 leading-relaxed space-y-3">
                                    <p v-for="(paragraph, index) in reportData.precedent_reference" :key="'precedent-' + index">{{ paragraph }}</p>
                                </div>
                            </div>
                            <div class="flex items-center justify-end mt-auto">
                                <span class="text-xs text-slate-400">司法判例仅供参考，具体结果以实际裁决为准</span>
                            </div>
                        </div>

                        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                            <div class="flex items-center mb-6">
                                <div class="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center mr-3">
                                    <i class="fas fa-book"></i>
                                </div>
                                <h3 class="text-xl font-bold text-slate-800">相关法律法规依据</h3>
                            </div>
                            <div class="space-y-4 text-sm bg-slate-50 p-6 rounded-xl text-slate-600 flex-1">
                                <div v-for="(law, lawIndex) in reportData.legal_references" :key="'law-' + lawIndex">
                                    <div class="font-bold text-slate-800 mb-3">{{ law.law }}</div>
                                    <div v-for="(article, articleIndex) in law.articles" :key="'article-' + lawIndex + '-' + articleIndex" :class="{ 'mt-3': articleIndex > 0 }">
                                        <p class="font-semibold text-slate-800 mb-1">{{ article.number }}</p>
                                        <p>{{ article.content }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="reportStep === 2" class="space-y-8 animate__animated animate__fadeIn">
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm flex items-start space-x-4">
                        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md">
                            <i class="fas fa-lightbulb text-lg"></i>
                        </div>
                        <div class="flex-1 flex items-center">
                            <p class="text-slate-800 text-[18px] font-medium leading-relaxed">
                                在综合智能分析与您的案件情况后，建议您后续优先考虑<span class="font-bold text-blue-600 text-[20px]">调解</span>。广州仲裁委员会始终秉持“为每一起纠纷提供最佳解决方案”的理念，在您<span class="font-bold text-slate-900">排队等待仲裁立案</span>期间，为您准备了更为快速、便捷、低成本的调解服务，成功化解纠纷将大幅减少您的仲裁花费。
                            </p>
                        </div>
                    </div>

                    <div class="bg-blue-50/30 rounded-2xl p-6 border border-blue-100">
                        <div class="flex items-center mb-6">
                            <div class="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center mr-3">
                                <i class="fas fa-balance-scale"></i>
                            </div>
                            <h3 class="text-xl font-bold text-slate-800">维权策略推荐</h3>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="bg-white rounded-xl p-6 shadow-sm border-t-4 border-green-400 relative overflow-hidden flex flex-col h-full">
                                <div class="absolute top-4 right-4 bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">推荐方案</div>
                                <h4 class="text-lg font-bold text-green-700 mb-4 flex items-center"><i class="fas fa-handshake mr-2"></i>在线调解</h4>

                                <div class="flex-1 space-y-6">
                                    <div class="bg-green-50/50 p-4 rounded-lg border border-green-100">
                                        <div class="text-xs font-bold text-green-600 mb-3 flex items-center uppercase tracking-wider"><i class="fas fa-clock mr-1"></i> 时间成本</div>
                                        <div class="space-y-3 text-sm">
                                            <div class="flex justify-between"><span class="text-slate-500">预计调解周期</span><span class="font-bold text-slate-800">15-30天</span></div>
                                            <div class="flex justify-between"><span class="text-slate-500">平均处理时长</span><span class="font-bold text-slate-800">2-4小时</span></div>
                                            <div class="flex justify-between"><span class="text-slate-500">调解轮次</span><span class="font-bold text-slate-800">1-3轮</span></div>
                                            <div class="flex justify-between"><span class="text-slate-500">案件排队等待</span><span class="font-bold text-slate-800">1-3天</span></div>
                                        </div>
                                    </div>

                                    <div class="bg-green-50/50 p-4 rounded-lg border border-green-100">
                                        <div class="text-xs font-bold text-green-600 mb-3 flex items-center uppercase tracking-wider"><i class="fas fa-coins mr-1"></i> 经济成本</div>
                                        <div class="space-y-3 text-sm">
                                            <div class="flex justify-between"><span class="text-slate-500">调解服务费</span><span class="font-bold text-slate-800">500-1,500元</span></div>
                                            <div class="flex justify-between"><span class="text-slate-500">平台使用费</span><span class="font-bold text-green-600">免费</span></div>
                                            <div class="flex justify-between"><span class="text-slate-500">差旅费用</span><span class="font-bold text-slate-800">0元</span></div>
                                            <div class="flex justify-between"><span class="text-slate-500">律师费用</span><span class="font-bold text-slate-800">可选</span></div>
                                            <div class="pt-3 border-t border-green-100 flex justify-between items-center mt-3">
                                                <span class="font-bold text-slate-700">预估总费用</span>
                                                <span class="text-xl font-bold text-green-600">500-1,500元</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="bg-green-50 rounded-lg p-3 text-xs text-green-800 space-y-1 mt-6">
                                    <div class="flex items-center"><i class="fas fa-check text-green-500 mr-2"></i>在线进行，无往返奔波及额外支出</div>
                                    <div class="flex items-center"><i class="fas fa-check text-green-500 mr-2"></i>灵活安排时间，无误工损失</div>
                                    <div class="flex items-center"><i class="fas fa-check text-green-500 mr-2"></i>快速响应，调解费用相对较低</div>
                                </div>
                            </div>

                            <div class="bg-white rounded-xl p-6 shadow-sm border-t-4 border-orange-400 relative flex flex-col h-full">
                                <div class="absolute top-4 right-4 bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded font-bold">对比参考</div>
                                <h4 class="text-lg font-bold text-orange-700 mb-4 flex items-center"><i class="fas fa-gavel mr-2"></i>传统仲裁程序</h4>

                                <div class="flex-1 space-y-6">
                                    <div class="bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                                        <div class="text-xs font-bold text-orange-600 mb-3 flex items-center uppercase tracking-wider"><i class="fas fa-clock mr-1"></i> 时间成本</div>
                                        <div class="space-y-3 text-sm">
                                            <div class="flex justify-between"><span class="text-slate-500">预计仲裁周期</span><span class="font-bold text-slate-800">3-6个月</span></div>
                                            <div class="flex justify-between"><span class="text-slate-500">庭审及准备时间</span><span class="font-bold text-slate-800">20-40小时</span></div>
                                            <div class="flex justify-between"><span class="text-slate-500">开庭次数</span><span class="font-bold text-slate-800">2-4次</span></div>
                                            <div class="flex justify-between"><span class="text-slate-500">案件排期等待</span><span class="font-bold text-slate-800">30-60天</span></div>
                                        </div>
                                    </div>

                                    <div class="bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                                        <div class="text-xs font-bold text-orange-600 mb-3 flex items-center uppercase tracking-wider"><i class="fas fa-coins mr-1"></i> 经济成本</div>
                                        <div class="space-y-3 text-sm">
                                            <div class="flex justify-between"><span class="text-slate-500">仲裁费用</span><span class="font-bold text-slate-800">5,000-20,000元</span></div>
                                            <div class="flex justify-between"><span class="text-slate-500">律师费用</span><span class="font-bold text-slate-800">10,000-20,000元</span></div>
                                            <div class="flex justify-between"><span class="text-slate-500">差旅住宿费</span><span class="font-bold text-slate-800">1,000-3,000元</span></div>
                                            <div class="flex justify-between"><span class="text-slate-500">误工损失</span><span class="font-bold text-slate-800">2,000-8,000元</span></div>
                                            <div class="pt-3 border-t border-orange-100 flex justify-between items-center mt-3">
                                                <span class="font-bold text-slate-700">预估总费用</span>
                                                <span class="text-xl font-bold text-orange-600">1.8万-5.1万元</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="bg-orange-50 rounded-lg p-3 text-xs text-orange-800 space-y-1 mt-6">
                                    <div>需要多次出庭、准备材料</div>
                                    <div>包含差旅费、误工费、律师费等</div>
                                    <div>程序较为复杂，各项费用累计较高</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="reportStep === 2 || !pptDemoMode" class="p-4 border-t border-slate-100 bg-white/95 backdrop-blur rounded-b-2xl z-10 flex flex-col items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                <div v-if="reportStep === 1 && !pptDemoMode" class="w-full flex justify-center">
                    <button type="button" @click="$emit('next')" class="w-full max-w-sm py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2">
                        <span>查看维权策略推荐</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>

                <div v-if="reportStep === 2" class="w-full" :class="{'path-action-highlight': !isFilingCompleted}">
                    <div v-if="!isFilingCompleted" class="text-center mb-3" style="padding-top:6px;">
                        <span style="font-size:12px;font-weight:700;color:#2FA39A;letter-spacing:0.02em;">
                            立案流程最后一步，请在下方选择后续处理方式
                        </span>
                    </div>
                    <div class="flex items-center space-x-4 w-full justify-center">
                        <button type="button" @click="$emit('prev')" class="flex-none px-4 py-2.5 bg-slate-100 text-slate-500 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm">
                            <i class="fas fa-arrow-left mr-1"></i>上一步
                        </button>

                        <button type="button" @click="$emit('confirm', 'withdraw')" class="flex-1 max-w-[160px] py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-lg shadow-lg shadow-amber-500/30 hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-sm">
                            <i class="fas fa-undo-alt mr-2"></i>撤回案件
                        </button>

                        <button type="button" @click="$emit('confirm', 'mediation')"
                                :class="{'btn-mediation-glow': !isFilingCompleted}"
                                class="flex-1 max-w-[200px] py-2.5 bg-gradient-to-r from-[#2FA39A] to-[#258e86] text-white font-bold rounded-lg shadow-lg shadow-teal-500/30 hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-sm">
                            <i class="fas fa-handshake mr-2"></i>{{ mediationLabel }}
                        </button>
                    </div>

                    <button type="button" @click="$emit('confirm', 'arbitration')" class="mt-3 text-slate-400 text-xs hover:text-blue-500 transition-colors flex items-center justify-center w-full">
                        <span class="underline ml-1">联系客服，进行仲裁</span>
                    </button>
                </div>
            </div>
        </div>
    `
};
