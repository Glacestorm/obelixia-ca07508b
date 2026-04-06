// Static project inventory lists extracted from ApplicationStateAnalyzer
// These are hardcoded arrays used for codebase analysis

export const componentsList = [
  // Admin components (65)
  'AdaptiveAuthDashboard.tsx', 'AdminSidebar.tsx', 'AdvancedCompanyFilters.tsx', 
  'AdvancedMLDashboard.tsx', 'AlertHistoryViewer.tsx', 'APIDocumentation.tsx',
  'ApplicationStateAnalyzer.tsx', 'AssistantKnowledgeManager.tsx', 'AuditLogsViewer.tsx',
  'AuditorDashboard.tsx', 'BulkGoalsAssignment.tsx', 'CascadeGoalsManager.tsx',
  'ChatFileUpload.tsx', 'CommercialDirectorDashboard.tsx', 'CommercialManagerAudit.tsx', 
  'CommercialManagerDashboard.tsx', 'CompaniesManager.tsx', 'CompaniesPagination.tsx', 
  'CompanyDataCompleteness.tsx', 'CompanyExportButton.tsx', 'ConceptsManager.tsx', 
  'ContractedProductsReport.tsx', 'CoreBankingManager.tsx', 'Customer360Panel.tsx',
  'CustomerSegmentationPanel.tsx', 'DORAComplianceDashboard.tsx', 'DirectorAlertsPanel.tsx', 
  'EmailTemplatesManager.tsx', 'EnhancedCompanyCard.tsx', 'ExcelImporter.tsx', 
  'GeocodingRecalculator.tsx', 'GestorDashboard.tsx', 'GestoresMetrics.tsx', 
  'GoalsKPIDashboard.tsx', 'GoalsProgressTracker.tsx', 'ISO27001Dashboard.tsx',
  'ImportHistoryViewer.tsx', 'InternalAssistantChat.tsx', 'KPIReportHistory.tsx',
  'MLExplainabilityPanel.tsx', 'MapTooltipConfig.tsx', 'MetricsExplorer.tsx', 
  'NotificationCenterManager.tsx', 'OfficeDirectorDashboard.tsx', 'PredictiveAnalyticsDashboard.tsx',
  'ProductsManager.tsx', 'ProductsMetrics.tsx', 'RFMDashboard.tsx', 'SMSManager.tsx',
  'SharedVisitsCalendar.tsx', 'StatusColorsManager.tsx', 'SystemHealthMonitor.tsx', 
  'TPVGoalsManager.tsx', 'TPVManager.tsx', 'UsersManager.tsx', 'VinculacionMetrics.tsx',
  'VisitSheetAuditViewer.tsx', 'VisitSheetValidationPanel.tsx', 
  'VisitSheetsGestorComparison.tsx', 'VisitsMetrics.tsx', 'VoiceRecordButton.tsx',
  'WhiteLabelConfig.tsx', 'AIIntegrationConfig.tsx',
  // SPM components (6)
  'SPMDashboard.tsx', 'AutonomousAIPanel.tsx', 'GamificationWidget.tsx',
  'PipelineIntelligence.tsx', 'QuotaAssignmentForm.tsx', 'RevenueIntelligence.tsx',
  // Accounting components (40)
  'AccountingCompanyIndex.tsx', 'AccountingGroupsChart.tsx', 'AccountingMainMenu.tsx',
  'AccountingManager.tsx', 'AddedValueAnalysis.tsx', 'AnalyticalPLChart.tsx',
  'AuditTab.tsx', 'BalanceAnalysisArea.tsx', 'BalanceSheetForm.tsx',
  'BankRatingAnalysis.tsx', 'CashFlowAnalysis.tsx', 'CashFlowAnalysisWrapper.tsx',
  'CashFlowForm.tsx', 'CompanySearchBar.tsx', 'ConsolidatedStatementsManager.tsx',
  'DuPontPyramid.tsx', 'EBITEBITDAAnalysis.tsx', 'EconomicFinancialDashboard.tsx',
  'EnhancedCompanyHeader.tsx', 'EquityChangesForm.tsx', 'FinancialAnalysisTab.tsx',
  'FinancialNotesManager.tsx', 'FinancialRAGChat.tsx', 'FinancialStatementsHistory.tsx',
  'FinancingStatement.tsx', 'IncomeStatementChart.tsx', 'IncomeStatementForm.tsx',
  'LiquidityDebtRatios.tsx', 'LongTermFinancialAnalysis.tsx', 
  'LongTermFinancialAnalysisWrapper.tsx', 'MovingAnnualTrendChart.tsx',
  'MultiYearComparison.tsx', 'PDFImportDialog.tsx', 'PeriodYearSelector.tsx',
  'ProfitabilityTab.tsx', 'ProvisionalStatementsManager.tsx', 'RatiosPyramid.tsx',
  'ReportsTab.tsx', 'SectorSimulator.tsx', 'SectoralRatiosAnalysis.tsx',
  'TreasuryMovements.tsx', 'ValuationTab.tsx', 'WorkingCapitalAnalysis.tsx',
  'WorkingCapitalAnalysisWrapper.tsx', 'WorkingCapitalNOF.tsx', 'ZScoreAnalysis.tsx',
  // Auth components (3)
  'PasskeyButton.tsx', 'PasskeyManager.tsx', 'StepUpAuthDialog.tsx',
  // Company components (10)
  'BankAffiliationsManager.tsx', 'CompanyDetail.tsx', 'CompanyPhotosManager.tsx',
  'CompanyPrintReport.tsx', 'ContactsManager.tsx', 'DocumentsManager.tsx',
  'ExcelExportDialog.tsx', 'PDFExportDialog.tsx', 'TPVTerminalsManager.tsx',
  'VisitSheetsHistory.tsx',
  // Dashboard components (58)
  'AccountingDashboardCard.tsx', 'ActionPlanManager.tsx', 'ActivityStatistics.tsx',
  'AdvancedAnalyticsDashboardCard.tsx', 'AlertHistoryDashboardCard.tsx', 'AlertsManager.tsx',
  'AnalisisCohortes.tsx', 'AnalisisEmbudo.tsx', 'AnalisisGeografico.tsx',
  'BestPracticeComments.tsx', 'BestPracticesPanel.tsx', 'CompaniesDashboardCard.tsx',
  'ComparativaTemporales.tsx', 'ContractedProductsDashboardCard.tsx', 'DashboardExportButton.tsx',
  'DateRangeFilter.tsx', 'EmailReminderPreferences.tsx', 'FilteredMetricsWrapper.tsx',
  'GestorComparison.tsx', 'GestorDashboardCard.tsx', 'GestorEvolutionTimeline.tsx',
  'GestorFilterSelector.tsx', 'GestorOverviewSection.tsx', 'GestoresLeaderboard.tsx',
  'GoalsAlertsDashboardCard.tsx', 'KPIDashboardCard.tsx', 'MLPredictions.tsx',
  'MapButton.tsx', 'MapDashboardCard.tsx', 'MetricsCardsSection.tsx',
  'MetricsDashboardCard.tsx', 'NotificationPreferences.tsx', 'NotificationService.tsx',
  'NotificationsPanel.tsx', 'ObjetivosYMetas.tsx', 'PersonalActivityHistory.tsx',
  'PersonalGoalsDetailedAnalysis.tsx', 'PersonalGoalsHistory.tsx', 'PersonalGoalsTracker.tsx',
  'PersonalKPIsDashboard.tsx', 'PowerBIExport.tsx', 'PrediccionesFuturas.tsx',
  'PushNotifications.tsx', 'QuickActionsPanel.tsx', 'QuickVisitManager.tsx',
  'QuickVisitSheetCard.tsx', 'RealtimeNotificationsBadge.tsx', 'ResumenEjecutivo.tsx',
  'SPMDashboardCard.tsx', 'TPVGestorRanking.tsx', 'TPVGoalsComparison.tsx', 
  'TPVGoalsDashboard.tsx', 'TPVGoalsHistory.tsx', 'UnifiedMetricsDashboard.tsx', 
  'UpcomingVisitsWidget.tsx', 'VisitReminders.tsx',
  // Map components (18)
  'CompanyPhotosDialog.tsx', 'GeoSearch.tsx', 'LazyMapContainer.tsx',
  'MapContainer.tsx', 'MapContainerTypes.ts', 'MapExportButton.tsx',
  'MapHeader.tsx', 'MapLayersControl.tsx', 'MapLegend.tsx',
  'MapSidebar.tsx', 'MapSkeleton.tsx', 'MapStatisticsPanel.tsx',
  'OpportunityHeatmap.tsx', 'RoutePlanner.tsx', 'SectorStats.tsx',
  'VisitsPanel.tsx', 'markerIcons.tsx', 'markerStyles.tsx',
  // Visit components (6)
  'AISummaryButton.tsx', 'ParticipantsSelector.tsx', 'SignaturePad.tsx', 
  'VisitSheetForm.tsx', 'VisitSheetPhotos.tsx', 'VisitSheetTemplateSelector.tsx',
  // Reports components (6)
  'AppDetailedStatusGenerator.tsx', 'CodebaseIndexGenerator.tsx',
  'CompetitorGapAnalysisGenerator.tsx', 'DynamicTechnicalDocGenerator.tsx',
  'ReportGenerator.tsx', 'TechnicalDocumentGenerator.tsx',
  // Security components (1)
  'MFAEnforcementDialog.tsx',
  // Help components (3)
  'HelpButton.tsx', 'HelpCenter.tsx', 'SuggestionBox.tsx',
  // Performance components (4)
  'OptimizedImage.tsx', 'PerformanceMonitor.tsx', 'SSRCacheProvider.tsx', 'StreamingBoundary.tsx',
  // eIDAS components (1)
  'EIDASVerificationPanel.tsx',
  // Presence components (1)
  'OnlineUsersIndicator.tsx',
  // Chat components
  'ChatMessage.tsx', 'ChatRoom.tsx', 'ChatRoomsList.tsx', 'ChatTypingIndicator.tsx',
  // Pipeline components
  'OpportunityCard.tsx', 'OpportunitySidebar.tsx', 'PipelineBoard.tsx',
  // UI/Root components (6)
  'ConflictDialog.tsx', 'ErrorBoundary.tsx', 'GlobalNavHeader.tsx',
  'LanguageSelector.tsx', 'LanguageSelectorHeader.tsx', 'NavLink.tsx', 'ThemeSelector.tsx'
];

export const hooksList = [
  'use-mobile', 'use-toast', 'useAIAgents', 'useAMLFraudDetection', 
  'useAchievementNotifications', 'useAdaptiveAuth', 'useAdvancedMLScoring',
  'useAnomalyDetection', 'useAuth', 'useBehavioralBiometrics', 'useCelebration',
  'useChurnPrediction', 'useCompaniesServerPagination', 'useCompanyPhotosLazy',
  'useCreditScoring', 'useCustomer360', 'useDeepLearning', 'useDeferredValue',
  'useEIDAS', 'useGoalsQuery', 'useIntelligentOCR', 'useMFAEnforcement',
  'useMLExplainability', 'useModelRegistry', 'useNavigationHistory', 'useNotifications',
  'useNotificationsQuery', 'useOfflineSync', 'useOpportunities', 'useOptimisticLock',
  'usePartytown', 'usePerformanceMonitor', 'usePresence', 'useProductRecommendations',
  'usePushNotifications', 'useRandomForest', 'useReact19Actions', 'useRealtimeChannel',
  'useRealtimeChat', 'useSMS', 'useSalesPerformance', 'useSpeculationRules',
  'useStreamingData', 'useTransactionEnrichment', 'useTransitionState',
  'useViewTransitions', 'useVisitSummary', 'useVisitsQuery', 'useVoiceChat',
  'useVoiceRecorder', 'useWebAuthn', 'useWebVitals', 'useWidgetLayout', 'useXAMA'
];

export const edgeFunctions = [
  // IA y Análisis (8)
  'advanced-ml-scoring', 'analyze-codebase', 'analyze-system-issues', 'generate-action-plan',
  'generate-ml-predictions', 'search-ai-recommendations', 'search-improvements', 'summarize-visit',
  // CRM y Clientes (7)
  'calculate-customer-360', 'calculate-rfm-analysis', 'calculate-sales-performance',
  'segment-customers-ml', 'smart-column-mapping', 'search-company-photo', 'product-recommendations',
  // Finanzas y Contabilidad (4)
  'financial-rag-chat', 'generate-financial-embeddings', 'parse-financial-pdf', 'open-banking-api',
  // ML y Deep Learning (7)
  'credit-scoring', 'deep-learning-predict', 'detect-anomalies', 'detect-revenue-signals',
  'ml-explainability', 'predict-churn', 'random-forest-predict',
  // Mapas y Geolocalización (8)
  'geocode-address', 'optimize-route', 'get-mapbox-token', 'mapbox-directions', 
  'mapbox-elevation', 'mapbox-isochrone', 'mapbox-matrix', 'mapbox-static', 'proxy-map-tiles',
  // Alertas y Monitoreo (7)
  'check-alerts', 'check-goal-achievements', 'check-goals-at-risk', 'check-low-performance',
  'check-visit-reminders', 'check-visit-sheet-reminders', 'escalate-alerts',
  // Notificaciones (12)
  'dispatch-webhook', 'notify-visit-validation', 'send-alert-email', 'send-critical-opportunity-email',
  'send-daily-kpi-report', 'send-goal-achievement-email', 'send-monthly-kpi-report', 
  'send-monthly-reports', 'send-push-notification', 'send-reminder-email', 'send-sms',
  'send-step-up-otp', 'send-visit-calendar-invite', 'send-weekly-kpi-report',
  // Seguridad y Auth (5)
  'evaluate-session-risk', 'verify-step-up-challenge', 'webauthn-verify', 'manage-user',
  // Sistema y Utilidades (7)
  'core-banking-adapter', 'enrich-transaction', 'generate-ai-tasks', 'generate-kpis',
  'intelligent-ocr', 'internal-assistant-chat', 'voice-to-text',
  // DORA/Salud Sistema (3)
  'run-stress-test', 'scheduled-health-check', 'system-health'
];

export const pagesList = ['Dashboard', 'MapView', 'Admin', 'Profile', 'VisitSheets', 'Home', 'Auth', 'Index', 'NotFound'];

export const securityFeatures = [
  'RLS (Row Level Security) en todas las tablas críticas',
  'JWT verification en Edge Functions críticas',
  'Autenticación Multifactor Adaptativa (AMA) - PSD2/PSD3 compliant',
  'WebAuthn/Passkeys para autenticación sin contraseña',
  'Step-Up Authentication con OTP por email',
  'Evaluación de riesgo de sesión con geolocalización IP',
  'Detección de VPN/Proxy en autenticación',
  'Dispositivos de confianza con fingerprinting',
  'Rate limiting en APIs (100 req/hora geocoding)',
  'Sanitización XSS con DOMPurify',
  'Optimistic locking para edición concurrente',
  'TLS 1.3 en tránsito',
  'AES-256 en reposo (Supabase)',
  'CORS configurado por dominio',
  'Audit logging completo con timestamps',
  'Rotación automática de tokens JWT',
  'PKCE flow para OAuth',
  'Content Security Policy headers',
  'Input validation con Zod schemas',
  'Biometría comportamental (keystroke dynamics, mouse patterns)',
  'Detección de device fingerprint changes',
  'Token binding por sesión',
  'Protección contra replay attacks',
  'Session fixation prevention',
  'Automatic session timeout (configurable)',
];
