'use client';
import dynamic from 'next/dynamic';
import QRCode from 'qrcode';
import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

// app/api/translations/route.ts
import { NextResponse } from 'next/server';

const VillageMap = dynamic(() => import('./VillageMap'), {
  ssr: false,
  loading: () => <div style={{ height: '500px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div>
});


const WaveGenixDashboard: React.FC = () => {
  // State management
// Add this with your other state declarations
const [manualLocation, setManualLocation] = useState({ lat: '', lng: '' });
const [showManualInput, setShowManualInput] = useState(false);
const [mapCenter, setMapCenter] = useState({ lat: 23.1815, lng: 79.9864 });
const [mapZoom, setMapZoom] = useState(5);
const [currentLocation, setCurrentLocation] = useState({ lat: null, lng: null });
const [currentTime, setCurrentTime] = useState('');
const [isClient, setIsClient] = useState(false);
const [alertFilter, setAlertFilter] = useState('all');
// Add these with your other state declarations
const [voiceQueue, setVoiceQueue] = useState<string[]>([]);
const [isSpeaking, setIsSpeaking] = useState(false);
const [lastSpoken, setLastSpoken] = useState<{[key: string]: string}>({});
const [voiceSchedule, setVoiceSchedule] = useState([
  { id: 1, time: '08:00', enabled: true, message: 'Morning water quality report' },
  { id: 2, time: '12:00', enabled: true, message: 'Mid-day alert check' },
  { id: 3, time: '18:00', enabled: true, message: 'Evening summary' },
]);
// Video modal handlers - Add this with your other functions
const openVideoModal = (video: any) => {
  console.log('Opening video:', video); // Debug log
  setSelectedVideo(video);
  setShowVideoModal(true);
};

const closeVideoModal = () => {
  setShowVideoModal(false);
  setSelectedVideo(null);
};

// Download infographic
const downloadInfographic = (item) => {
  // Create a simple PDF or image download
  const content = `
    ${item.title}\n
    Water Quality Infographic\n
    Learn about water quality and conservation\n
    Visit WaveGenix for more information
  `;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.title.toLowerCase().replace(/ /g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  alert(`Downloading: ${item.title}`);
};

// Read article
const readArticle = (article) => {
  // Open modal or show article content
  alert(`Opening: ${article.title}\n\nThis article explains about water quality and its importance.\n\nRead time: ${article.readTime}`);
};

// Health resource handlers
const viewHealthDetails = (resource) => {
  alert(`Health Resource: ${resource.title}\n\n${resource.description}\n\nFor more information, please contact your local health center.`);
};

// State for selected video
const [selectedVideo, setSelectedVideo] = useState(null);

// Filter alerts based on selected filter
const getFilteredAlerts = () => {
  if (alertFilter === 'all') {
    return alerts;
  }
  return alerts.filter(alert => alert.type === alertFilter);
};
// Helper function for pH position in scale-game
const getPhPosition = (question: any) => {
  // Return approximate pH position based on question
  if (question.question.includes('ideal pH')) return 50;
  if (question.question.includes('acidic')) return 20;
  if (question.question.includes('alkaline')) return 80;
  return 50;
};

// Learning tips for each question
const getLearningTip = (questionIndex: number) => {
  const tips = [
    '💡 The ideal pH for drinking water is between 6.5 and 8.5',
    '💡 High TDS indicates presence of dissolved minerals',
    '💡 Turbidity measures how clear the water is'
  ];
  return tips[questionIndex] || '💡 Keep learning about water quality!';
};

// Get score color
const getScoreColor = (score: number, total: number) => {
  const percentage = (score / total) * 100;
  if (percentage >= 80) return '#22c55e';
  if (percentage >= 50) return '#f59e0b';
  return '#ef4444';
};

// Encouragement message based on score
const getEncouragementMessage = (score: number, total: number) => {
  const percentage = (score / total) * 100;
  if (percentage === 100) return 'Perfect! You\'re a water quality expert! 🏆';
  if (percentage >= 80) return 'Great job! You know your water quality! 🌟';
  if (percentage >= 60) return 'Good effort! Keep learning! 📚';
  if (percentage >= 40) return 'Nice try! Practice makes perfect! 💪';
  return 'Don\'t worry! Learn from mistakes and try again! 🌱';
};

// Share score function
const shareScore = () => {
  const text = `I scored ${quizState.score}/${quizQuestions.length} on the WaveGenix pH Learning Game! Can you beat my score?`;
  if (navigator.share) {
    navigator.share({
      title: 'My WaveGenix Quiz Score',
      text: text,
      url: window.location.href,
    });
  } else {
    alert('Share feature not supported');
  }
};

  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [currentTheme, setCurrentTheme] = useState('light');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [emergencyAlertActive, setEmergencyAlertActive] = useState(true);
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [quizState, setQuizState] = useState({
    currentQuestion: 0,
    score: 0,
    answered: false,
    selectedOption: null,
  });

  // Quiz questions
  const quizQuestions = [
    {
      question: 'What is the ideal pH range for drinking water?',
      options: ['6.5-8.5', '5.0-6.5', '8.5-9.5', '4.0-5.0'],
      correct: 0,
    },
    {
      question: 'What does high TDS in water indicate?',
      options: ['Pure water', 'Dissolved minerals and salts', 'Low temperature', 'High oxygen'],
      correct: 1,
    },
    {
      question: 'Which parameter indicates water clarity?',
      options: ['pH', 'Turbidity', 'Temperature', 'Dissolved Oxygen'],
      correct: 1,
    },
  ];

  const [waterQualityData, setWaterQualityData] = useState({
    pH: 7.2,
    TDS: 320,
    temperature: 24,
    turbidity: 0.8,
    dissolvedOxygen: 6.5,
    quality: 'Good',
    location: 'Community Water Source',
    lastUpdated: new Date().toLocaleString(),
    recommendations: 'Safe for drinking',
  });

  const [dashboardStats, setDashboardStats] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([
    { id: 1, type: 'critical', message: 'High TDS detected in Village A', time: '2 min ago' },
    { id: 2, type: 'warning', message: 'pH levels approaching unsafe range in Village B', time: '15 min ago' },
    { id: 3, type: 'info', message: 'Scheduled maintenance for sensors in Village C', time: '1 hour ago' },
  ]);

  const [villageHeads, setVillageHeads] = useState<any[]>([
    { id: 1, name: 'Rajesh Kumar', village: 'Village A', contact: '+91 98765 43210', since: '2020', lat: 23.1815, lng: 79.9864, waterQuality: 'Good' },
    { id: 2, name: 'Priya Singh', village: 'Village B', contact: '+91 98765 43211', since: '2019', lat: 23.2599, lng: 79.8711, waterQuality: 'Moderate' },
    { id: 3, name: 'Mohammed Ali', village: 'Village C', contact: '+91 98765 43212', since: '2021', lat: 23.0225, lng: 80.2410, waterQuality: 'Poor' },
  ]);

  const [waterBodies, setWaterBodies] = useState<any[]>([
  { id: 1, name: 'Ganga River', type: 'river', distance: '2.5 km', quality: 'Good', pH: 7.2, lat: 23.1605, lng: 79.8711 },
  { id: 2, name: 'Village Pond', type: 'pond', distance: '0.8 km', quality: 'Moderate', pH: 6.8, lat: 23.2115, lng: 79.9364 },
  { id: 3, name: 'Community Well', type: 'well', distance: '1.2 km', quality: 'Poor', pH: 6.2, lat: 23.0975, lng: 80.2560 },
]);

  const [educationContent, setEducationContent] = useState<any>({
  videos: [
    { 
      id: 1, 
      title: 'Understanding Water Quality', 
      duration: '6:22', 
      thumbnail: '🎥',
      videoId: '6KqHlGQn5Q8',
      videoUrl: 'https://www.youtube.com/embed/6KqHlGQn5Q8'
    },
    { 
      id: 2, 
      title: 'How to Test Water Quality at Home', 
      duration: '8:15', 
      thumbnail: '📹',
      videoId: 'rR0WqQwZqY4',
      videoUrl: 'https://www.youtube.com/embed/rR0WqQwZqY4'
    },
    { 
      id: 3, 
      title: 'Water Conservation Tips for Everyone', 
      duration: '4:45', 
      thumbnail: '🎬',
      videoId: 'o0VrZPBskpg',
      videoUrl: 'https://www.youtube.com/embed/o0VrZPBskpg'
    },
  ],
  infographics: [
    { id: 1, title: 'Water Cycle', type: 'infographic', icon: '📊' },
    { id: 2, title: 'pH Scale Explained', type: 'infographic', icon: '📈' },
    { id: 3, title: 'Water Treatment Process', type: 'infographic', icon: '📉' },
  ],
  articles: [
    { id: 1, title: 'Understanding Water Quality Parameters', readTime: '5 min' },
    { id: 2, title: 'Impact of Pollution on Water Sources', readTime: '7 min' },
    { id: 3, title: 'Community Water Management Guide', readTime: '10 min' },
  ],
});

  const [healthResources, setHealthResources] = useState<any[]>([
    { id: 1, title: 'Water-Borne Diseases', description: 'Prevention and symptoms', icon: '🏥' },
    { id: 2, title: 'Emergency Contacts', description: 'Nearby health centers', icon: '📞' },
    { id: 3, title: 'First Aid Guide', description: 'For water-related illnesses', icon: '🚑' },
  ]);

  const videoModalRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  

  // Translations
const translations: Record<string, Record<string, string>> = {
  // ==================== ENGLISH ====================
  en: {
    // App Header
    appName: 'WaveGenix',
    welcome: 'Welcome to WaveGenix',
    lastUpdated: 'Last updated',
    
    // Navigation Menu
    navDashboard: '📊 Dashboard',
    navMap: '🗺️ Village Map',
    navAnalytics: '📈 Analytics',
    navAlerts: '🔔 Alerts',
    navQRGenerator: '📱 QR Generator',
    navGame: '🎮 pH Learning Game',
    navVillageHeads: '👥 Village Heads',
    navEducation: '📚 Education Hub',
    navHealth: '🏥 Health Resources',
    navReports: '📝 Reports & Complaints',
    navSettings: '⚙️ Settings',
    
    // Dashboard Header
    goodMorning: 'Good Morning',
    goodAfternoon: 'Good Afternoon',
    goodEvening: 'Good Evening',
    user: 'User',
    villageAreaLabel: 'Village Area',
    activeSensors: 'Active Sensors',
    allOnline: 'All Online',
    villagesCovered: 'Villages Covered',
    fullCoverage: '100% Coverage',
    overallQuality: 'Overall Quality',
    fromYesterday: '↑ 5% from yesterday',
    nextCheck: 'Next Check',
    inTwoHours: 'In 2 hours',
    
    // Water Quality Parameters
    phLevel: 'pH Level',
    tdsLevel: 'TDS Level',
    temperature: 'Temperature',
    turbidity: 'Turbidity',
    dissolvedOxygen: 'Dissolved Oxygen',
    stable: 'Stable',
    good: 'Good',
    normal: 'Normal',
    clear: 'Clear',
    healthy: 'Healthy',
    excellent: 'Excellent',
    optimal: 'Optimal',
    moderate: 'Moderate',
    poor: 'Poor',
    critical: 'Critical',
    
    // Quick Actions
    refreshData: 'Refresh Data',
    downloadReport: 'Download Report',
    share: 'Share',
    viewAlerts: 'View Alerts',
    
    // Chart Section
    weeklyTrend: 'Weekly Water Quality Trend',
    phAvg: '7.2 avg',
    tdsAvg: '320 avg',
    aiPrediction: 'AI Quality Prediction',
    waterIsSafe: 'Water is Safe',
    confidence: 'Confidence',
    phBalance: 'pH Balance',
    purity: 'Purity',
    minerals: 'Minerals',
    nextScheduled: 'Next scheduled check',
    todayTime: 'Today 4:00 PM',
    aiInsight: 'Water quality is excellent. Regular monitoring recommended every 2 weeks.',
    
    // Widgets
    recentAlerts: 'Recent Alerts',
    viewAll: 'View all',
    todayStats: "Today's Stats",
    samplesTested: 'Samples tested',
    passRate: 'Pass rate',
    sevenDayStreak: '7 Day Streak!',
    perfectRecord: 'Perfect monitoring record',
    
    // Alerts Section
    criticalAlert: 'Critical Alert',
    warningAlert: 'Warning',
    infoAlert: 'Information',
    liveAlertFeed: 'Live Alert Feed',
    acknowledge: 'Acknowledge',
    speak: 'Speak',
    noAlerts: 'No Alerts Found',
    noAlertsMsg: 'No alerts at the moment',
    
    // Voice Alert System
    voiceAlertSystem: 'Voice Alert System',
    voiceAlerts: 'Voice Alerts',
    enableDisableVoice: 'Enable/disable voice notifications',
    testVoice: 'Test Voice',
    previewVoice: 'Preview voice alert',
    test: 'Test',
    queueStatus: 'Queue Status',
    idle: 'Idle',
    pending: 'pending',
    speaking: 'Speaking...',
    todaysAnnouncements: "Today's Announcements",
    spoken: 'spoken',
    scheduledVoice: 'Scheduled Voice Announcements',
    automaticNote: 'Automatic - runs every minute',
    morningReport: 'Morning water quality report',
    midDayAlert: 'Mid-day alert check',
    eveningSummary: 'Evening summary',
    
    // Map Section
    villageMap: 'Village Map',
    viewVillages: 'View villages and water bodies on the interactive map',
    getMyLocation: 'Get My Location',
    findWaterBodies: 'Find Water Bodies',
    clearWaterBodies: 'Clear Water Bodies',
    refreshNearby: 'Refresh Nearby Water Bodies',
    useDemoLocation: 'Use Demo Location',
    nearbyWaterBodies: 'Nearby Water Bodies',
    searchWaterBodies: 'Search water bodies...',
    quality: 'Quality',
    distance: 'Distance',
    type: 'Type',
    noWaterBodies: 'No water bodies found in your area',
    
    // Village Heads Section
    villageHeads: 'Village Heads',
    meetRepresentatives: 'Meet your village representatives and community leaders',
    totalHeads: 'Total Heads',
    goodQuality: 'Good Quality',
    contact: 'Contact',
    since: 'Since',
    profile: 'Profile',
    call: 'Call',
    message: 'Message',
    whatsapp: 'WhatsApp',
    aboutVillageHeads: 'About Village Heads',
    villageHeadInfo: 'Village heads are your primary point of contact for water quality concerns.',
    reportingIssues: 'Reporting water quality issues',
    meetingUpdates: 'Community meeting updates',
    maintenanceRequests: 'Maintenance requests',
    dataAccess: 'Water quality data access',
    noHeadsFound: 'No Village Heads Found',
    noHeadsMsg: 'There are no village heads registered in the system yet.',
    addNewHead: 'Add New Head',
    
    // Education Section
    educationHub: 'Education Hub',
    learnWaterQuality: 'Learn about water quality through videos, infographics, and articles',
    awarenessVideos: 'Awareness Videos',
    infographics: 'Infographics',
    learningResources: 'Learning Resources',
    watchNow: 'Watch Now',
    download: 'Download',
    readMore: 'Read More',
    views: 'views',
    clickToDownload: 'Click to download and learn more',
    videoPlayer: 'Video Player',
    playVideo: 'Play Video',
    close: 'Close',
    waterQualityBasics: 'Water Quality Basics',
    howToTest: 'How to Test Water at Home',
    waterConservation: 'Water Conservation Tips',
    waterCycle: 'Water Cycle',
    phScaleExplained: 'pH Scale Explained',
    waterTreatment: 'Water Treatment Process',
    understandingParameters: 'Understanding Water Quality Parameters',
    impactOfPollution: 'Impact of Pollution on Water Sources',
    communityGuide: 'Community Water Management Guide',
    
    // Health Section
    healthResources: 'Health Resources',
    accessHealth: 'Access health resources and emergency contacts for water-related illnesses',
    healthTips: 'Health Tips',
    alwaysBoil: 'Always boil water if quality is uncertain',
    washHands: 'Wash hands before handling drinking water',
    storeWater: 'Store water in clean, covered containers',
    reportIllness: 'Report any water-borne illness immediately',
    useFilters: 'Use water filters for additional safety',
    checkRegularly: 'Check water quality regularly',
    emergencyContacts: 'Emergency Contacts',
    ambulance: 'Ambulance',
    healthHelpline: 'Health Helpline',
    waterHelpline: 'Water Quality Helpline',
    emergency: 'Emergency',
    waterAdvisory: 'Water Quality Advisory',
    waterAdvisoryText: 'Regular water testing recommended in your area. Use filtered water for drinking.',
    waterBorneDiseases: 'Water-Borne Diseases',
    preventionSymptoms: 'Prevention and symptoms',
    firstAidGuide: 'First Aid Guide',
    forWaterRelated: 'For water-related illnesses',
    
    // Reports Section
    reportsComplaints: 'Reports & Complaints',
    submitTrack: 'Submit and track water quality complaints in your village',
    total: 'Total',
    pending: 'Pending',
    inProgress: 'In Progress',
    resolved: 'Resolved',
    viewComplaints: 'View Complaints',
    newComplaint: 'New Complaint',
    submitNewComplaint: 'Submit New Complaint',
    provideDetails: 'Please provide details about the water quality issue',
    complaintTitle: 'Complaint Title',
    location: 'Location',
    category: 'Category',
    description: 'Description',
    cancel: 'Cancel',
    submit: 'Submit Report',
    tip: 'Include specific details like time, location, and photos if possible',
    recentComplaints: 'Recent Complaints',
    allStatus: 'All Status',
    searchComplaints: 'Search complaints...',
    noComplaints: 'No Complaints Found',
    noComplaintsMsg: 'There are no complaints in the system yet. Click "New Complaint" to submit one.',
    markResolved: 'Mark as Resolved',
    markInProgress: 'Mark In Progress',
    delete: 'Delete',
    viewDetails: 'View Details',
    id: 'ID',
    submittedJustNow: 'Submitted just now',
    selectCategory: 'Select category',
    waterQualityCategory: 'Water Quality',
    infrastructure: 'Infrastructure',
    waterSupply: 'Water Supply',
    other: 'Other',
    
    // Settings Section
    settings: 'Settings',
    configurePreferences: 'Configure your dashboard preferences',
    language: 'Language',
    theme: 'Theme',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    notifications: 'Notifications',
    enableVoiceAlerts: 'Enable Voice Alerts',
    dataRefresh: 'Data Refresh',
    refreshNow: 'Refresh Now',
    
    // Game Section
    phLearningGame: 'pH Learning Game',
    testKnowledge: 'Test your knowledge about water quality and pH levels',
    score: 'Score',
    question: 'Question',
    progress: 'Progress',
    acidic: 'Acidic',
    neutral: 'Neutral',
    alkaline: 'Alkaline',
    correct: 'Correct!',
    incorrect: 'Incorrect!',
    nextQuestion: 'Next Question',
    seeResults: 'See Results',
    quizComplete: 'Quiz Complete!',
    correctAnswers: 'Correct Answers',
    wrongAnswers: 'Wrong Answers',
    accuracy: 'Accuracy',
    playAgain: 'Play Again',
    shareScore: 'Share Score',
    perfectScore: 'Perfect Score! Achievement Unlocked!',
    quickPhFacts: 'Quick pH Facts',
    phFact1: 'pH 7 is neutral (pure water)',
    phFact2: 'pH below 7 is acidic',
    phFact3: 'pH above 7 is alkaline',
    excellentJob: 'Excellent! You\'re learning fast!',
    keepLearning: 'Keep learning!',
    perfectExpert: 'Perfect! You\'re a water quality expert!',
    greatJob: 'Great job! You know your water quality!',
    goodEffort: 'Good effort! Keep learning!',
    niceTry: 'Nice try! Practice makes perfect!',
    idealPhRange: 'What is the ideal pH range for drinking water?',
    highTdsIndicates: 'What does high TDS in water indicate?',
    waterClarity: 'Which parameter indicates water clarity?',
    pureWater: 'Pure water',
    dissolvedMinerals: 'Dissolved minerals and salts',
    lowTemperature: 'Low temperature',
    highOxygen: 'High oxygen',
    
    // QR Generator
    qrCode: 'QR Code',
    scanQR: 'Scan this QR code to view current water quality information on any device',
    currentWaterStatus: 'Current Water Status',
    regenerate: 'Regenerate',
    downloadPNG: 'Download PNG',
    testConditions: 'Test Different Water Conditions',
    goodCondition: 'Good',
    moderateCondition: 'Moderate',
    poorCondition: 'Poor',
    safeForDrinking: 'Safe for drinking',
    useWithCaution: 'Use with caution',
    notSafeForDrinking: 'Not safe for drinking',
    
    // Analytics Section
    villageComparison: 'Village Comparison',
    waterQualityTrends: 'Water Quality Trends',
    villageA: 'Village A',
    villageB: 'Village B',
    villageC: 'Village C',
    
    // Emergency Banner
    emergencyAlert: '🚨 EMERGENCY: Unsafe water detected!',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    ok: 'OK',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    reset: 'Reset',
    refresh: 'Refresh',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    first: 'First',
    last: 'Last',
    page: 'Page',
    of: 'of',
    items: 'items',
    noData: 'No data available',
    confirm: 'Confirm',
    warning: 'Warning',
    info: 'Information',
    successMessage: 'Operation completed successfully',
    errorMessage: 'An error occurred. Please try again.',
  },

  // ==================== TAMIL (தமிழ்) ====================
  ta: {
    appName: 'வேவ்ஜெனிக்ஸ்',
    welcome: 'வேவ்ஜெனிக்ஸ் க்கு வரவேற்கிறோம்',
    lastUpdated: 'கடைசியாக புதுப்பிக்கப்பட்டது',
    
    navDashboard: '📊 டாஷ்போர்டு',
    navMap: '🗺️ கிராம வரைபடம்',
    navAnalytics: '📈 பகுப்பாய்வு',
    navAlerts: '🔔 எச்சரிக்கைகள்',
    navQRGenerator: '📱 QR ஜெனரேட்டர்',
    navGame: '🎮 pH கற்றல் விளையாட்டு',
    navVillageHeads: '👥 கிராம தலைவர்கள்',
    navEducation: '📚 கல்வி மையம்',
    navHealth: '🏥 சுகாதார வளங்கள்',
    navReports: '📝 புகார்கள் & முறைப்பாடுகள்',
    navSettings: '⚙️ அமைப்புகள்',
    
    goodMorning: 'இனிய காலை',
    goodAfternoon: 'இனிய மதியம்',
    goodEvening: 'இனிய மாலை',
    user: 'பயனர்',
    villageAreaLabel: 'கிராமப் பகுதி',
    activeSensors: 'செயலில் உள்ள சென்சார்கள்',
    allOnline: 'அனைத்தும் ஆன்லைன்',
    villagesCovered: 'உள்ளடக்கிய கிராமங்கள்',
    fullCoverage: '100% உள்ளடக்கம்',
    overallQuality: 'ஒட்டுமொத்த தரம்',
    fromYesterday: '↑ நேற்றை விட 5% அதிகம்',
    nextCheck: 'அடுத்த சோதனை',
    inTwoHours: '2 மணி நேரத்தில்',
    
    phLevel: 'pH அளவு',
    tdsLevel: 'TDS அளவு',
    temperature: 'வெப்பநிலை',
    turbidity: 'கலங்கல்',
    dissolvedOxygen: 'கரைந்த ஆக்ஸிஜன்',
    stable: 'நிலையான',
    good: 'நல்லது',
    normal: 'சாதாரண',
    clear: 'தெளிவான',
    healthy: 'ஆரோக்கியமான',
    excellent: 'சிறப்பு',
    optimal: 'உகந்த',
    moderate: 'நடுத்தர',
    poor: 'மோசமான',
    critical: 'முக்கியமான',
    
    refreshData: 'தரவை புதுப்பி',
    downloadReport: 'அறிக்கையை பதிவிறக்கு',
    share: 'பகிர்',
    viewAlerts: 'எச்சரிக்கைகளை காண்',
    
    weeklyTrend: 'வாராந்திர நீர் தரப் போக்கு',
    phAvg: '7.2 சராசரி',
    tdsAvg: '320 சராசரி',
    aiPrediction: 'AI தர கணிப்பு',
    waterIsSafe: 'நீர் பாதுகாப்பானது',
    confidence: 'நம்பிக்கை',
    phBalance: 'pH சமநிலை',
    purity: 'தூய்மை',
    minerals: 'கனிமங்கள்',
    nextScheduled: 'அடுத்த திட்டமிட்ட சோதனை',
    todayTime: 'இன்று மாலை 4:00',
    aiInsight: 'நீர் தரம் சிறப்பாக உள்ளது. ஒவ்வொரு 2 வாரமும் கண்காணிப்பு பரிந்துரைக்கப்படுகிறது.',
    
    recentAlerts: 'சமீபத்திய எச்சரிக்கைகள்',
    viewAll: 'அனைத்தையும் காண்',
    todayStats: 'இன்றைய புள்ளிவிவரங்கள்',
    samplesTested: 'சோதிக்கப்பட்ட மாதிரிகள்',
    passRate: 'தேர்ச்சி விகிதம்',
    sevenDayStreak: '7 நாள் தொடர்!',
    perfectRecord: 'சிறந்த கண்காணிப்பு பதிவு',
    
    criticalAlert: 'முக்கிய எச்சரிக்கை',
    warningAlert: 'எச்சரிக்கை',
    infoAlert: 'தகவல்',
    liveAlertFeed: 'நேரடி எச்சரிக்கை ஊட்டம்',
    acknowledge: 'ஒப்புக்கொள்',
    speak: 'பேசு',
    noAlerts: 'எச்சரிக்கைகள் எதுவும் இல்லை',
    noAlertsMsg: 'தற்போது எச்சரிக்கைகள் இல்லை',
    
    voiceAlertSystem: 'குரல் எச்சரிக்கை அமைப்பு',
    voiceAlerts: 'குரல் எச்சரிக்கைகள்',
    enableDisableVoice: 'குரல் அறிவிப்புகளை இயக்கு/முடக்கு',
    testVoice: 'குரலை சோதிக்கவும்',
    previewVoice: 'குரல் எச்சரிக்கையை முன்னோட்டமிடுக',
    test: 'சோதனை',
    queueStatus: 'வரிசை நிலை',
    idle: 'செயலற்றது',
    pending: 'நிலுவையில்',
    speaking: 'பேசுகிறது...',
    todaysAnnouncements: 'இன்றைய அறிவிப்புகள்',
    spoken: 'பேசப்பட்டது',
    scheduledVoice: 'திட்டமிடப்பட்ட குரல் அறிவிப்புகள்',
    automaticNote: 'தானியங்கி - ஒவ்வொரு நிமிடமும் இயங்கும்',
    morningReport: 'காலை நீர் தர அறிக்கை',
    midDayAlert: 'நண்பகல் எச்சரிக்கை சோதனை',
    eveningSummary: 'மாலை சுருக்கம்',
    
    villageMap: 'கிராம வரைபடம்',
    viewVillages: 'கிராமங்கள் மற்றும் நீர் ஆதாரங்களைக் காண்க',
    getMyLocation: 'என் இருப்பிடத்தைப் பெறுக',
    findWaterBodies: 'நீர் ஆதாரங்களைக் கண்டறிக',
    clearWaterBodies: 'நீர் ஆதாரங்களை அழி',
    refreshNearby: 'அருகிலுள்ள நீர் ஆதாரங்களை புதுப்பி',
    useDemoLocation: 'மாதிரி இருப்பிடத்தைப் பயன்படுத்துக',
    nearbyWaterBodies: 'அருகிலுள்ள நீர் ஆதாரங்கள்',
    searchWaterBodies: 'நீர் ஆதாரங்களைத் தேடுக...',
    quality: 'தரம்',
    distance: 'தூரம்',
    type: 'வகை',
    noWaterBodies: 'உங்கள் பகுதியில் நீர் ஆதாரங்கள் எதுவும் கிடைக்கவில்லை',
    
    villageHeads: 'கிராம தலைவர்கள்',
    meetRepresentatives: 'உங்கள் கிராம பிரதிநிதிகள் மற்றும் சமூக தலைவர்களை சந்திக்கவும்',
    totalHeads: 'மொத்த தலைவர்கள்',
    goodQuality: 'நல்ல தரம்',
    contact: 'தொடர்பு',
    since: 'முதல்',
    profile: 'சுயவிவரம்',
    call: 'அழைக்க',
    message: 'செய்தி அனுப்ப',
    whatsapp: 'வாட்ஸ்ஆப்',
    aboutVillageHeads: 'கிராம தலைவர்கள் பற்றி',
    villageHeadInfo: 'கிராம தலைவர்கள் நீர் தர கவலைகளுக்கான உங்கள் முதல் தொடர்பு புள்ளி.',
    reportingIssues: 'நீர் தர பிரச்சினைகளை புகாரளித்தல்',
    meetingUpdates: 'சமூக கூட்டம் புதுப்பிப்புகள்',
    maintenanceRequests: 'பராமரிப்பு கோரிக்கைகள்',
    dataAccess: 'நீர் தர தரவு அணுகல்',
    noHeadsFound: 'கிராம தலைவர்கள் எதுவும் இல்லை',
    noHeadsMsg: 'கணினியில் இதுவரை கிராம தலைவர்கள் பதிவு செய்யப்படவில்லை.',
    addNewHead: 'புதிய தலைவரை சேர்க்கவும்',
    
    educationHub: 'கல்வி மையம்',
    learnWaterQuality: 'வீடியோக்கள், இன்போகிராஃபிக்ஸ் மற்றும் கட்டுரைகள் மூலம் நீர் தரத்தைப் பற்றி அறிக',
    awarenessVideos: 'விழிப்புணர்வு வீடியோக்கள்',
    infographics: 'தகவல் வரைபடங்கள்',
    learningResources: 'கற்றல் வளங்கள்',
    watchNow: 'இப்போது பார்க்க',
    download: 'பதிவிறக்கு',
    readMore: 'மேலும் படிக்க',
    views: 'பார்வைகள்',
    clickToDownload: 'பதிவிறக்க மற்றும் மேலும் அறிய கிளிக் செய்யவும்',
    videoPlayer: 'வீடியோ பிளேயர்',
    playVideo: 'வீடியோவை இயக்கு',
    close: 'மூடு',
    
    healthResources: 'சுகாதார வளங்கள்',
    accessHealth: 'நீர் தொடர்பான நோய்களுக்கான சுகாதார வளங்கள் மற்றும் அவசர தொடர்புகளை அணுகவும்',
    healthTips: 'சுகாதார குறிப்புகள்',
    alwaysBoil: 'தரம் உறுதியாக தெரியவில்லை என்றால் எப்போதும் தண்ணீரை கொதிக்க வைக்கவும்',
    washHands: 'குடிநீரை கையாள்வதற்கு முன் கைகளை கழுவவும்',
    storeWater: 'தண்ணீரை சுத்தமான, மூடிய கொள்கலன்களில் சேமிக்கவும்',
    reportIllness: 'எந்த நீர் மூல நோயையும் உடனடியாக புகாரளிக்கவும்',
    useFilters: 'கூடுதல் பாதுகாப்பிற்கு நீர் வடிகட்டிகளைப் பயன்படுத்தவும்',
    checkRegularly: 'தவறாமல் நீர் தரத்தை சரிபார்க்கவும்',
    emergencyContacts: 'அவசர தொடர்புகள்',
    ambulance: 'ஆம்புலன்ஸ்',
    healthHelpline: 'சுகாதார உதவி எண்',
    waterHelpline: 'நீர் தர உதவி எண்',
    emergency: 'அவசரம்',
    waterAdvisory: 'நீர் தர அறிவுரை',
    waterAdvisoryText: 'உங்கள் பகுதியில் வழக்கமான நீர் பரிசோதனை பரிந்துரைக்கப்படுகிறது. குடிப்பதற்கு வடிகட்டிய தண்ணீரைப் பயன்படுத்தவும்.',
    
    reportsComplaints: 'அறிக்கைகள் மற்றும் புகார்கள்',
    submitTrack: 'உங்கள் கிராமத்தில் நீர் தர புகார்களை சமர்ப்பிக்கவும் மற்றும் கண்காணிக்கவும்',
    total: 'மொத்தம்',
    pending: 'நிலுவையில்',
    inProgress: 'செயல்பாட்டில்',
    resolved: 'தீர்க்கப்பட்டது',
    viewComplaints: 'புகார்களைக் காண்',
    newComplaint: 'புதிய புகார்',
    submitNewComplaint: 'புதிய புகாரை சமர்ப்பிக்கவும்',
    provideDetails: 'நீர் தர பிரச்சினை பற்றிய விவரங்களை வழங்கவும்',
    complaintTitle: 'புகார் தலைப்பு',
    location: 'இருப்பிடம்',
    category: 'வகை',
    description: 'விளக்கம்',
    cancel: 'ரத்து செய்',
    submit: 'புகாரை சமர்ப்பிக்கவும்',
    tip: 'முடிந்தால் நேரம், இருப்பிடம் மற்றும் புகைப்படங்கள் போன்ற குறிப்பிட்ட விவரங்களை சேர்க்கவும்',
    recentComplaints: 'சமீபத்திய புகார்கள்',
    allStatus: 'அனைத்து நிலைகளும்',
    searchComplaints: 'புகார்களைத் தேடுக...',
    noComplaints: 'புகார்கள் எதுவும் கிடைக்கவில்லை',
    noComplaintsMsg: 'கணினியில் இதுவரை புகார்கள் இல்லை. ஒன்றை சமர்ப்பிக்க "புதிய புகார்" என்பதைக் கிளிக் செய்யவும்.',
    markResolved: 'தீர்க்கப்பட்டதாக குறிக்கவும்',
    markInProgress: 'செயல்பாட்டில் குறிக்கவும்',
    delete: 'நீக்கவும்',
    viewDetails: 'விவரங்களைக் காண்க',
    id: 'அடையாளம்',
    submittedJustNow: 'இப்போது சமர்ப்பிக்கப்பட்டது',
    
    settings: 'அமைப்புகள்',
    configurePreferences: 'உங்கள் டாஷ்போர்டு விருப்பங்களை உள்ளமைக்கவும்',
    language: 'மொழி',
    theme: 'கருப்பொருள்',
    darkMode: 'இருண்ட முறை',
    lightMode: 'ஒளிரும் முறை',
    notifications: 'அறிவிப்புகள்',
    enableVoiceAlerts: 'குரல் எச்சரிக்கைகளை இயக்கு',
    dataRefresh: 'தரவு புதுப்பிப்பு',
    refreshNow: 'இப்போது புதுப்பிக்கவும்',
    
    phLearningGame: 'pH கற்றல் விளையாட்டு',
    testKnowledge: 'நீர் தரம் மற்றும் pH அளவுகள் பற்றிய உங்கள் அறிவை சோதிக்கவும்',
    score: 'மதிப்பெண்',
    question: 'கேள்வி',
    progress: 'முன்னேற்றம்',
    acidic: 'அமிலத்தன்மை',
    neutral: 'நடுநிலை',
    alkaline: 'காரத்தன்மை',
    correct: 'சரியானது!',
    incorrect: 'தவறானது!',
    nextQuestion: 'அடுத்த கேள்வி',
    seeResults: 'முடிவுகளைக் காண்',
    quizComplete: 'வினாடி வினா முடிந்தது!',
    correctAnswers: 'சரியான பதில்கள்',
    wrongAnswers: 'தவறான பதில்கள்',
    accuracy: 'துல்லியம்',
    playAgain: 'மீண்டும் விளையாடு',
    shareScore: 'மதிப்பெண்ணைப் பகிர்',
    perfectScore: 'சரியான மதிப்பெண்! சாதனை திறக்கப்பட்டது!',
    quickPhFacts: 'விரைவான pH உண்மைகள்',
    phFact1: 'pH 7 என்பது நடுநிலை (தூய நீர்)',
    phFact2: 'pH 7 க்கும் குறைவானது அமிலத்தன்மை',
    phFact3: 'pH 7 க்கும் அதிகமானது காரத்தன்மை',
    
    qrCode: 'QR குறியீடு',
    scanQR: 'எந்த சாதனத்திலும் தற்போதைய நீர் தர தகவலைக் காண இந்த QR குறியீட்டை ஸ்கேன் செய்யவும்',
    currentWaterStatus: 'தற்போதைய நீர் நிலை',
    regenerate: 'மீண்டும் உருவாக்கு',
    downloadPNG: 'PNG ஐப் பதிவிறக்கு',
    testConditions: 'வெவ்வேறு நீர் நிலைகளை சோதிக்கவும்',
    goodCondition: 'நல்லது',
    moderateCondition: 'மிதமான',
    poorCondition: 'மோசமான',
    
    villageComparison: 'கிராம ஒப்பீடு',
    waterQualityTrends: 'நீர் தரப் போக்குகள்',
    
    emergencyAlert: '🚨 அவசரம்: பாதுகாப்பற்ற நீர் கண்டறியப்பட்டது!',
    
    loading: 'ஏற்றுகிறது...',
    error: 'பிழை',
    success: 'வெற்றி',
    ok: 'சரி',
    save: 'சேமி',
    edit: 'திருத்து',
    add: 'சேர்',
    search: 'தேடு',
    filter: 'வடிகட்டு',
    reset: 'மீட்டமை',
    refresh: 'புதுப்பி',
    back: 'பின்',
    next: 'அடுத்து',
    previous: 'முந்தைய',
    noData: 'தரவு இல்லை',
    confirm: 'உறுதிப்படுத்து',
    warning: 'எச்சரிக்கை',
    info: 'தகவல்',
  },
  
  // ==================== HINDI (हिंदी) ====================
  hi: {
    appName: 'वेवजेनिक्स',
    welcome: 'वेवजेनिक्स में आपका स्वागत है',
    lastUpdated: 'अंतिम अपडेट',
    
    navDashboard: '📊 डैशबोर्ड',
    navMap: '🗺️ गांव का नक्शा',
    navAnalytics: '📈 विश्लेषण',
    navAlerts: '🔔 अलर्ट',
    navQRGenerator: '📱 क्यूआर जेनरेटर',
    navGame: '🎮 पीएच सीखने का खेल',
    navVillageHeads: '👥 गांव के मुखिया',
    navEducation: '📚 शिक्षा केंद्र',
    navHealth: '🏥 स्वास्थ्य संसाधन',
    navReports: '📝 रिपोर्ट और शिकायतें',
    navSettings: '⚙️ सेटिंग्स',
    
    goodMorning: 'सुप्रभात',
    goodAfternoon: 'शुभ अपराह्न',
    goodEvening: 'शुभ संध्या',
    user: 'उपयोगकर्ता',
    villageAreaLabel: 'गांव क्षेत्र',
    activeSensors: 'सक्रिय सेंसर',
    allOnline: 'सभी ऑनलाइन',
    villagesCovered: 'गांव कवर किए',
    fullCoverage: '100% कवरेज',
    overallQuality: 'कुल गुणवत्ता',
    fromYesterday: '↑ कल से 5% अधिक',
    nextCheck: 'अगली जांच',
    inTwoHours: '2 घंटे में',
    
    phLevel: 'पीएच स्तर',
    tdsLevel: 'टीडीएस स्तर',
    temperature: 'तापमान',
    turbidity: 'गंदलापन',
    dissolvedOxygen: 'विलयित ऑक्सीजन',
    stable: 'स्थिर',
    good: 'अच्छा',
    normal: 'सामान्य',
    clear: 'साफ़',
    healthy: 'स्वस्थ',
    excellent: 'उत्कृष्ट',
    optimal: 'इष्टतम',
    moderate: 'मध्यम',
    poor: 'खराब',
    critical: 'गंभीर',
    
    refreshData: 'डेटा रिफ्रेश करें',
    downloadReport: 'रिपोर्ट डाउनलोड करें',
    share: 'शेयर करें',
    viewAlerts: 'अलर्ट देखें',
    
    weeklyTrend: 'साप्ताहिक जल गुणवत्ता रुझान',
    phAvg: '7.2 औसत',
    tdsAvg: '320 औसत',
    aiPrediction: 'एआई गुणवत्ता पूर्वानुमान',
    waterIsSafe: 'पानी सुरक्षित है',
    confidence: 'विश्वास स्तर',
    phBalance: 'पीएच संतुलन',
    purity: 'शुद्धता',
    minerals: 'खनिज',
    nextScheduled: 'अगली निर्धारित जांच',
    todayTime: 'आज शाम 4:00 बजे',
    aiInsight: 'जल गुणवत्ता उत्कृष्ट है। हर 2 सप्ताह में नियमित निगरानी की सिफारिश की जाती है।',
    
    recentAlerts: 'हाल के अलर्ट',
    viewAll: 'सभी देखें',
    todayStats: 'आज के आंकड़े',
    samplesTested: 'परीक्षित नमूने',
    passRate: 'पास दर',
    sevenDayStreak: '7 दिन की स्ट्रीक!',
    perfectRecord: 'परफेक्ट मॉनिटरिंग रिकॉर्ड',
    
    criticalAlert: 'गंभीर चेतावनी',
    warningAlert: 'चेतावनी',
    infoAlert: 'जानकारी',
    liveAlertFeed: 'लाइव अलर्ट फीड',
    acknowledge: 'स्वीकार करें',
    speak: 'बोलें',
    noAlerts: 'कोई अलर्ट नहीं',
    noAlertsMsg: 'इस समय कोई अलर्ट नहीं',
    
    voiceAlertSystem: 'वॉयस अलर्ट सिस्टम',
    voiceAlerts: 'वॉयस अलर्ट',
    enableDisableVoice: 'वॉयस नोटिफिकेशन सक्षम/अक्षम करें',
    testVoice: 'वॉयस टेस्ट करें',
    previewVoice: 'वॉयस अलर्ट का पूर्वावलोकन',
    test: 'टेस्ट',
    queueStatus: 'क्यू स्थिति',
    idle: 'निष्क्रिय',
    pending: 'लंबित',
    speaking: 'बोल रहा है...',
    todaysAnnouncements: 'आज की घोषणाएं',
    spoken: 'बोला गया',
    scheduledVoice: 'अनुसूचित वॉयस घोषणाएं',
    automaticNote: 'स्वचालित - हर मिनट चलता है',
    morningReport: 'सुबह की जल गुणवत्ता रिपोर्ट',
    midDayAlert: 'दोपहर की अलर्ट जांच',
    eveningSummary: 'शाम का सारांश',
    
    villageMap: 'गांव का नक्शा',
    viewVillages: 'गांवों और जल निकायों को इंटरैक्टिव मानचित्र पर देखें',
    getMyLocation: 'मेरा स्थान प्राप्त करें',
    findWaterBodies: 'जल निकाय खोजें',
    clearWaterBodies: 'जल निकाय साफ़ करें',
    refreshNearby: 'आस-पास के जल निकाय रिफ्रेश करें',
    useDemoLocation: 'डेमो लोकेशन का उपयोग करें',
    nearbyWaterBodies: 'आस-पास के जल निकाय',
    searchWaterBodies: 'जल निकाय खोजें...',
    quality: 'गुणवत्ता',
    distance: 'दूरी',
    type: 'प्रकार',
    noWaterBodies: 'आपके क्षेत्र में कोई जल निकाय नहीं मिला',
    
    // Continue with other sections similarly...
  },

  // ==================== TELUGU (తెలుగు) ====================
  te: {
    appName: 'వేవ్జెనిక్స్',
    welcome: 'వేవ్జెనిక్స్ కు స్వాగతం',
    lastUpdated: 'చివరిగా నవీకరించబడింది',
    
    navDashboard: '📊 డాష్‌బోర్డ్',
    navMap: '🗺️ గ్రామ మ్యాప్',
    navAnalytics: '📈 విశ్లేషణ',
    navAlerts: '🔔 హెచ్చరికలు',
    navQRGenerator: '📱 QR జనరేటర్',
    navGame: '🎮 pH లెర్నింగ్ గేమ్',
    navVillageHeads: '👥 గ్రామ పెద్దలు',
    navEducation: '📚 విద్యా కేంద్రం',
    navHealth: '🏥 ఆరోగ్య వనరులు',
    navReports: '📝 ఫిర్యాదులు & కంప్లైంట్లు',
    navSettings: '⚙️ సెట్టింగ్‌లు',
    
    goodMorning: 'శుభోదయం',
    goodAfternoon: 'శుభ మద్యాహ్నం',
    goodEvening: 'శుభ సాయంత్రం',
    user: 'వినియోగదారు',
    villageAreaLabel: 'గ్రామ ప్రాంతం',
    activeSensors: 'యాక్టివ్ సెన్సార్లు',
    allOnline: 'అన్నీ ఆన్‌లైన్',
    villagesCovered: 'గ్రామాలు కవర్ చేయబడ్డాయి',
    fullCoverage: '100% కవరేజ్',
    overallQuality: 'మొత్తం నాణ్యత',
    fromYesterday: '↑ నిన్నటి కంటే 5% ఎక్కువ',
    nextCheck: 'తదుపరి తనిఖీ',
    inTwoHours: '2 గంటల్లో',
    
    phLevel: 'pH స్థాయి',
    tdsLevel: 'TDS స్థాయి',
    temperature: 'ఉష్ణోగ్రత',
    turbidity: 'టర్బిడిటీ',
    dissolvedOxygen: 'కరిగిన ఆక్సిజన్',
    stable: 'స్థిరంగా',
    good: 'మంచిది',
    normal: 'సాధారణం',
    clear: 'స్పష్టమైన',
    healthy: 'ఆరోగ్యకరమైన',
    excellent: 'అద్భుతమైన',
    optimal: 'సరైన',
    moderate: 'మధ్యస్థం',
    poor: 'పేలవమైన',
    critical: 'క్రిటికల్',
    
    // Continue with remaining keys...
  },

  // ==================== MALAYALAM (മലയാളം) ====================
  ml: {
    appName: 'വേവ്ജെനിക്സ്',
    welcome: 'വേവ്ജെനിക്സിലേക്ക് സ്വാഗതം',
    lastUpdated: 'അവസാനമായി പുതുക്കിയത്',
    
    navDashboard: '📊 ഡാഷ്ബോർഡ്',
    navMap: '🗺️ ഗ്രാമ ഭൂപടം',
    navAnalytics: '📈 വിശകലനം',
    navAlerts: '🔔 അലേർട്ടുകൾ',
    navQRGenerator: '📱 QR ജനറേറ്റർ',
    navGame: '🎮 pH പഠന ഗെയിം',
    navVillageHeads: '👥 ഗ്രാമ മുഖ്യന്മാർ',
    navEducation: '📚 വിദ്യാഭ്യാസ ഹബ്',
    navHealth: '🏥 ആരോഗ്യ വിഭവങ്ങൾ',
    navReports: '📝 റിപ്പോർട്ടുകളും പരാതികളും',
    navSettings: '⚙️ ക്രമീകരണങ്ങൾ',
    
    goodMorning: 'സുപ്രഭാതം',
    goodAfternoon: 'ശുഭ മദ്ധ്യാഹ്നം',
    goodEvening: 'ശുഭ സായാഹ്നം',
    user: 'ഉപയോക്താവ്',
    villageAreaLabel: 'ഗ്രാമ പ്രദേശം',
    activeSensors: 'സജീവ സെൻസറുകൾ',
    allOnline: 'എല്ലാം ഓൺലൈൻ',
    villagesCovered: 'ഗ്രാമങ്ങൾ ഉൾക്കൊള്ളിച്ചു',
    fullCoverage: '100% കവറേജ്',
    overallQuality: 'മൊത്തം ഗുണനിലവാരം',
    fromYesterday: '↑ ഇന്നലെയേക്കാൾ 5% കൂടുതൽ',
    nextCheck: 'അടുത്ത പരിശോധന',
    inTwoHours: '2 മണിക്കൂറിൽ',
    
    phLevel: 'pH നില',
    tdsLevel: 'TDS നില',
    temperature: 'താപനില',
    turbidity: 'ടർബിഡിറ്റി',
    dissolvedOxygen: 'ലയിച്ച ഓക്സിജൻ',
    stable: 'സ്ഥിരത',
    good: 'നല്ലത്',
    normal: 'സാധാരണ',
    clear: 'വ്യക്തമായ',
    healthy: 'ആരോഗ്യകരം',
    excellent: 'മികച്ചത്',
    optimal: 'അനുയോജ്യം',
    moderate: 'മിതമായ',
    poor: 'മോശം',
    critical: 'നിർണായക',
    
    // Continue with remaining keys...
  },
};

// Helper function - Keep as is
const t = (key: string): string => {
  return translations[currentLanguage]?.[key] || translations['en']?.[key] || key;
};
 

// Helper functions - Add this after your state declarations
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return t('morning');
  if (hour < 17) return t('afternoon');
  return t('evening');
};

const downloadReport = () => {
  // Add your download logic here
  alert('Downloading report...');
};

const shareDashboard = () => {
  // Add your share logic here
  alert('Sharing dashboard...');
};


// Theme toggle function
const toggleTheme = () => {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setCurrentTheme(newTheme);
  // IMPORTANT: Set on HTML element
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  console.log('Theme changed to:', newTheme); // Check console
};

// Initialize theme
useEffect(() => {
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme) {
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Check system preference
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultTheme = systemPrefersDark ? 'dark' : 'light';
    setCurrentTheme(defaultTheme);
    document.documentElement.setAttribute('data-theme', defaultTheme);
  }
 // LANGUAGE initialization
  const savedLanguage = localStorage.getItem('preferred-language');
  if (savedLanguage) {
    setCurrentLanguage(savedLanguage);
  } else {
    // Detect browser language
    const browserLang = navigator.language.split('-')[0];
    const supportedLanguages = ['hi', 'ta', 'te', 'ml', 'en'];
    
    if (supportedLanguages.includes(browserLang)) {
      setCurrentLanguage(browserLang);
    } else {
      setCurrentLanguage('en'); // Default to English
    }
  }
}, []);

// Sync theme when it changes
useEffect(() => {
  document.documentElement.setAttribute('data-theme', currentTheme);
}, [currentTheme]);





// Change language
const changeLanguage = (lang: string) => {
  setCurrentLanguage(lang);
  localStorage.setItem('preferred-language', lang); // Save preference
};

  // Close emergency banner
  const closeEmergencyBanner = () => {
    setEmergencyAlertActive(false);
  };





















// View complaint details
const viewComplaintDetails = (complaint: any) => {
  console.log('Viewing complaint:', complaint);
  alert(`Complaint Details:\nTitle: ${complaint.title}\nLocation: ${complaint.location}\nDescription: ${complaint.description}`);
};

// Update your complaint state to include category
// Update your initial complaints:
useEffect(() => {
  setComplaints([
    {
      id: 1,
      title: 'Contaminated well water',
      location: 'Village A, Near Temple',
      date: new Date().toLocaleDateString(),
      status: 'pending',
      description: 'Well water appears cloudy and has a foul smell. Villagers are unable to use it for drinking.',
      category: 'water-quality'
    },
    {
      id: 2,
      title: 'Broken water pump',
      location: 'Village B, Main Street',
      date: new Date().toLocaleDateString(),
      status: 'in-progress',
      description: 'Community water pump not working for 3 days. Affecting 50+ families.',
      category: 'infrastructure'
    },
  ]);
}, []);

// Handle contact button
const handleContact = (head: any) => {
  console.log('Contacting:', head);
  // Add your contact logic here
  if (head.contact) {
    window.open(`tel:${head.contact}`);
  }
};

// View profile
const viewProfile = (head: any) => {
  console.log('Viewing profile:', head);
  // Add profile view logic
  alert(`Viewing ${head.name}'s profile`);
};

// Add new head (you can implement this)
const addNewHead = () => {
  console.log('Add new village head');
  // Add your logic here
};

  // Alert action handlers
// Alert action handlers
const handleAcknowledge = (alertId: number) => {
  setAlerts(prev => prev.map(alert => 
    alert.id === alertId ? { ...alert, acknowledged: true } : alert
  ));
  speakText('Alert acknowledged');
};

const handleViewDetails = (alert: any) => {
  console.log('Viewing alert details:', alert);
  // Show modal or navigate to details
};

const handleShare = (alert: any) => {
  console.log('Sharing alert:', alert);
  // Implement share functionality
};

const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  // Toggle voice alerts
  const toggleVoiceAlerts = (enabled: boolean) => {
    setVoiceAlertsEnabled(enabled);
  };

  // Test voice alert
  const testVoiceAlert = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        'Warning: Water quality alert detected!'
      );
      window.speechSynthesis.speak(utterance);
    }
  };
const getLocation = () => {
  // Your actual location coordinates - change this!
  const yourLat = 10.727768;  // Change to your latitude
  const yourLng = 78.561017;  // Change to your longitude
  
  setCurrentLocation({ lat: yourLat, lng: yourLng });
  setMapCenter({ lat: yourLat, lng: yourLng });
  setMapZoom(14);
  
  const nearbyWaterBodies = [
    {
      id: 1,
      name: 'Nearby Lake',
      type: 'lake',
      distance: `${calculateDistance(yourLat, yourLng, yourLat + 0.01, yourLng + 0.008).toFixed(1)} km`,
      quality: 'Good',
      pH: 7.2,
      lat: yourLat + 0.01,
      lng: yourLng + 0.008
    },
    {
      id: 2,
      name: 'Local Pond',
      type: 'pond',
      distance: `${calculateDistance(yourLat, yourLng, yourLat - 0.012, yourLng - 0.01).toFixed(1)} km`,
      quality: 'Moderate',
      pH: 6.8,
      lat: yourLat - 0.012,
      lng: yourLng - 0.01
    },
    {
      id: 3,
      name: 'Community Well',
      type: 'well',
      distance: `${calculateDistance(yourLat, yourLng, yourLat + 0.015, yourLng - 0.012).toFixed(1)} km`,
      quality: 'Poor',
      pH: 6.5,
      lat: yourLat + 0.015,
      lng: yourLng - 0.012
    }
  ];
  
  setWaterBodies(nearbyWaterBodies);
  alert(`📍 Location set to your area!`);
};
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
// Fetch real videos from Pixabay API (Free)
const fetchWaterQualityVideos = async () => {
  try {
    const API_KEY = 'YOUR_PIXABAY_API_KEY'; // Get free key from pixabay.com
    const response = await fetch(
      `https://pixabay.com/api/videos/?key=${API_KEY}&q=water+quality&per_page=5`
    );
    const data = await response.json();
    
    if (data.hits && data.hits.length > 0) {
      const fetchedVideos = data.hits.map((hit, index) => ({
        id: index + 1,
        title: hit.tags.split(',')[0] || 'Water Quality Video',
        duration: `${Math.floor(hit.duration)}:00`,
        thumbnail: '🎥',
        videoId: hit.videos?.small?.url || '',
        videoUrl: hit.videos?.small?.url || '',
        isExternal: true
      }));
      
      setEducationContent(prev => ({
        ...prev,
        videos: fetchedVideos
      }));
    }
  } catch (error) {
    console.error('Error fetching videos:', error);
  }
};

// Call this in useEffect when component mounts
useEffect(() => {
  fetchWaterQualityVideos();
}, []);
const findWaterBodies = () => {
  if (currentLocation.lat && currentLocation.lng) {
    const { lat, lng } = currentLocation;
    
    // Create water bodies around current location
    const nearbyWaterBodies = [
      {
        id: 1,
        name: 'Nearby Lake',
        type: 'lake',
        distance: `${calculateDistance(lat, lng, lat + 0.01, lng + 0.008).toFixed(1)} km`,
        quality: 'Good',
        pH: 7.2,
        lat: lat + 0.01,
        lng: lng + 0.008
      },
      {
        id: 2,
        name: 'Local Pond',
        type: 'pond',
        distance: `${calculateDistance(lat, lng, lat - 0.012, lng - 0.01).toFixed(1)} km`,
        quality: 'Moderate',
        pH: 6.8,
        lat: lat - 0.012,
        lng: lng - 0.01
      },
      {
        id: 3,
        name: 'Community Well',
        type: 'well',
        distance: `${calculateDistance(lat, lng, lat + 0.015, lng - 0.012).toFixed(1)} km`,
        quality: 'Poor',
        pH: 6.5,
        lat: lat + 0.015,
        lng: lng - 0.012
      }
    ];
    
    setWaterBodies(nearbyWaterBodies);
    alert(`💧 Found ${nearbyWaterBodies.length} water bodies near your location!`);
  } else {
    alert('📍 Please get your location first using "Get My Location" button');
  }
};

// Mock Location Function
const useMockLocation = () => {
  // Chennai coordinates (example)
  const mockLat = 13.0827;
  const mockLng = 80.2707;
  
  setCurrentLocation({ lat: mockLat, lng: mockLng });
  setMapCenter({ lat: mockLat, lng: mockLng });
  setMapZoom(12);
  
  const nearbyWaterBodies = [
    {
      id: 1,
      name: 'Adyar River',
      type: 'river',
      distance: `${calculateDistance(mockLat, mockLng, mockLat + 0.008, mockLng + 0.005).toFixed(1)} km`,
      quality: 'Moderate',
      pH: 7.0,
      lat: mockLat + 0.008,
      lng: mockLng + 0.005
    },
    {
      id: 2,
      name: 'Chembarambakkam Lake',
      type: 'lake',
      distance: `${calculateDistance(mockLat, mockLng, mockLat - 0.015, mockLng - 0.01).toFixed(1)} km`,
      quality: 'Good',
      pH: 7.2,
      lat: mockLat - 0.015,
      lng: mockLng - 0.01
    },
    {
      id: 3,
      name: 'Community Well',
      type: 'well',
      distance: `${calculateDistance(mockLat, mockLng, mockLat + 0.005, mockLng - 0.008).toFixed(1)} km`,
      quality: 'Poor',
      pH: 6.5,
      lat: mockLat + 0.005,
      lng: mockLng - 0.008
    }
  ];
  
  setWaterBodies(nearbyWaterBodies);
  alert(`📍 Mock location set!\nLat: ${mockLat}\nLng: ${mockLng}\n\n✅ Found ${nearbyWaterBodies.length} water bodies!`);
};



const clearWaterBodies = () => {
  // Reset to default water bodies with default distances
  setWaterBodies([
    { id: 1, name: 'Ganga River', type: 'river', distance: '2.5 km', quality: 'Good', pH: 7.2, lat: 23.1605, lng: 79.8711 },
    { id: 2, name: 'Village Pond', type: 'pond', distance: '0.8 km', quality: 'Moderate', pH: 6.8, lat: 23.2115, lng: 79.9364 },
    { id: 3, name: 'Community Well', type: 'well', distance: '1.2 km', quality: 'Poor', pH: 6.2, lat: 23.0975, lng: 80.2560 },
  ]);
  alert('🗑️ Water bodies list reset to default');
};
// Fetch real water bodies from OpenStreetMap API
const fetchNearbyWaterBodies = async (lat, lng) => {
  try {
    // Search for water bodies within 5km radius
    const radius = 5000; // 5km
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(node["natural"="water"](around:${radius},${lat},${lng});way["natural"="water"](around:${radius},${lat},${lng});relation["natural"="water"](around:${radius},${lat},${lng}););out;`;
    
    const response = await fetch(overpassUrl);
    const data = await response.json();
    
    if (data.elements && data.elements.length > 0) {
      const realWaterBodies = data.elements.slice(0, 10).map((element, index) => ({
        id: index + 1,
        name: element.tags?.name || `Water Body ${index + 1}`,
        type: element.tags?.water || element.tags?.natural || 'water',
        distance: 'Calculating...',
        quality: 'Good',
        pH: 7.0,
        lat: element.lat || element.center?.lat,
        lng: element.lon || element.center?.lon,
      }));
      
      return realWaterBodies;
    }
    return [];
  } catch (error) {
    console.error('Error fetching water bodies:', error);
    return [];
  }
};



















const refreshNearbyWaterBodies = () => {
  if (currentLocation.lat && currentLocation.lng) {
    getLocation(); // Re-fetch location and nearby water bodies
  } else {
    alert('Please get your location first');
  }
};

  // Generate QR Code
  // Generate QR Code with actual QR data
const generateQRCode = async () => {
  if (canvasRef.current) {
    try {
      // Clear canvas first
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create QR data with water quality information
      const qrData = JSON.stringify({
        app: 'WaveGenix',
        timestamp: new Date().toISOString(),
        waterQuality: {
          pH: waterQualityData.pH,
          TDS: waterQualityData.TDS,
          temperature: waterQualityData.temperature,
          turbidity: waterQualityData.turbidity,
          dissolvedOxygen: waterQualityData.dissolvedOxygen,
          quality: waterQualityData.quality,
          location: waterQualityData.location
        }
      });

      // Generate QR code on canvas
      await QRCode.toCanvas(canvas, qrData, {
        width: 250,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      console.log('QR Code generated successfully');
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback - show error message
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0000';
        ctx.font = '14px Arial';
        ctx.fillText('QR Generation Failed', 40, 120);
      }
    }
  }
};
  // const generateQRCode = () => {
  //   if (canvasRef.current) {
  //     const ctx = canvasRef.current.getContext('2d');
  //     if (ctx) {
  //       ctx.fillStyle = '#ffffff';
  //       ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  //       ctx.fillStyle = '#000000';
  //       ctx.font = '12px Arial';
  //       ctx.fillText('Water Quality Data', 40, 50);
  //       ctx.fillText(`pH: ${waterQualityData.pH}`, 40, 70);
  //       ctx.fillText(`TDS: ${waterQualityData.TDS}`, 40, 90);
  //       ctx.fillText(`Quality: ${waterQualityData.quality}`, 40, 110);
  //     }
  //   }
  // };

  // Download QR Code
  // Download QR Code
const downloadQRCode = () => {
  if (canvasRef.current) {
    try {
      // Convert canvas to data URL
      const dataURL = canvasRef.current.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `water-quality-${new Date().toISOString().slice(0,10)}.png`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('QR Code downloaded successfully');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download QR code');
    }
  }
};
  // const downloadQRCode = () => {
  //   if (canvasRef.current) {
  //     const link = document.createElement('a');
  //     link.href = canvasRef.current.toDataURL();
  //     link.download = 'water-quality-qr.png';
  //     link.click();
  //   }
  // };

  // Refresh water quality data
  const refreshWaterQualityData = () => {
    setWaterQualityData((prev) => ({
      ...prev,
      lastUpdated: new Date().toLocaleString(),
    }));
  };

  // Simulate water condition
  const simulateWaterCondition = (condition: string) => {
    const conditions: Record<string, any> = {
      good: {
        pH: 7.0,
        TDS: 250,
        temperature: 24,
        turbidity: 0.5,
        dissolvedOxygen: 7.5,
        quality: 'Good',
        recommendations: 'Safe for drinking',
      },
      moderate: {
        pH: 6.5,
        TDS: 400,
        temperature: 25,
        turbidity: 1.2,
        dissolvedOxygen: 5.5,
        quality: 'Moderate',
        recommendations: 'Use with caution',
      },
      poor: {
        pH: 5.5,
        TDS: 800,
        temperature: 30,
        turbidity: 3.5,
        dissolvedOxygen: 3.0,
        quality: 'Poor',
        recommendations: 'Not safe for drinking',
      },
    };
    setWaterQualityData((prev) => ({
      ...prev,
      ...conditions[condition],
    }));
  };

  // Share on social media
  const shareOnSocial = (platform: string) => {
    const text = `Check out this water quality information from WaveGenix: ${waterQualityData.quality} water quality at ${waterQualityData.location}`;
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    };
    if (urls[platform]) {
      window.open(urls[platform], '_blank');
    }
  };

  // Quiz handlers
  const handleAnswer = (optionIndex: number) => {
    if (!quizState.answered) {
      const isCorrect = optionIndex === quizQuestions[quizState.currentQuestion].correct;
      setQuizState(prev => ({
        ...prev,
        answered: true,
        selectedOption: optionIndex,
        score: isCorrect ? prev.score + 1 : prev.score,
      }));
    }
  };

  const nextQuestion = () => {
    if (quizState.currentQuestion < quizQuestions.length - 1) {
      setQuizState((prev) => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
        answered: false,
        selectedOption: null,
      }));
    }
  };

  const restartQuiz = () => {
    setQuizState({
      currentQuestion: 0,
      score: 0,
      answered: false,
      selectedOption: null,
    });
  };






  // Handle report form submit
  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const newComplaint = {
      id: complaints.length + 1,
      title: formData.get('title'),
      location: formData.get('location'),
      description: formData.get('description'),
      date: new Date().toLocaleDateString(),
      status: 'pending',
    };
    setComplaints([...complaints, newComplaint]);
    setShowReportForm(false);
    alert(t('reportSubmitted'));
  };

  // Update complaint status
  const updateComplaintStatus = (id: number, status: string) => {
    setComplaints(complaints.map(c => 
      c.id === id ? { ...c, status } : c
    ));
  };

  // Delete complaint
  const deleteComplaint = (id: number) => {
    setComplaints(complaints.filter(c => c.id !== id));
  };

 

// Fix hydration error - only show time on client
useEffect(() => {
  setIsClient(true);
  setCurrentTime(new Date().toLocaleTimeString());
  
  // Update time every minute
  const interval = setInterval(() => {
    setCurrentTime(new Date().toLocaleTimeString());
  }, 60000);
  
  return () => clearInterval(interval);
}, []);

// Speak text function
const speakText = (text: string) => {
  if (!voiceAlertsEnabled) {
    console.log('Voice alerts disabled');
    return;
  }

  if (!('speechSynthesis' in window)) {
    console.error('Speech synthesis not supported');
    return;
  }

  // Add to queue
  setVoiceQueue(prev => [...prev, text]);
};

// Process voice queue
useEffect(() => {
  if (voiceQueue.length > 0 && !isSpeaking && voiceAlertsEnabled) {
    setIsSpeaking(true);
    const text = voiceQueue[0];
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.includes('en') && (voice.name.includes('Google') || voice.name.includes('Female'))
    ) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setVoiceQueue(prev => prev.slice(1));
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      setVoiceQueue(prev => prev.slice(1));
    };
    
    window.speechSynthesis.speak(utterance);
  }
}, [voiceQueue, isSpeaking, voiceAlertsEnabled]);

// Check schedule every minute
useEffect(() => {
  if (!voiceAlertsEnabled) return;

  const checkSchedule = () => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    voiceSchedule.forEach(item => {
      if (item.enabled && item.time === currentTime) {
        const lastSpokenKey = `${item.id}_${item.time}`;
        const lastSpokenTime = lastSpoken[lastSpokenKey];
        
        if (!lastSpokenTime || (Date.now() - parseInt(lastSpokenTime)) > 60000) {
          speakText(item.message);
          setLastSpoken(prev => ({
            ...prev,
            [lastSpokenKey]: Date.now().toString()
          }));
        }
      }
    });
  };

  checkSchedule();
  const interval = setInterval(checkSchedule, 60000);
  
  return () => clearInterval(interval);
}, [voiceAlertsEnabled, voiceSchedule, lastSpoken]);
// Auto-speak critical alerts
useEffect(() => {
  if (!voiceAlertsEnabled) return;

  const criticalAlerts = alerts.filter(alert => 
    alert.type === 'critical' && !alert.acknowledged
  );

  criticalAlerts.forEach(alert => {
    const alertKey = `critical_${alert.id}`;
    const lastSpokenTime = lastSpoken[alertKey];
    
    if (!lastSpokenTime || (Date.now() - parseInt(lastSpokenTime)) > 300000) {
      speakText(`Critical alert: ${alert.message}`);
      setLastSpoken(prev => ({
        ...prev,
        [alertKey]: Date.now().toString()
      }));
    }
  });
}, [alerts, voiceAlertsEnabled, lastSpoken]);

// Auto-generate QR when component mounts or water quality changes
useEffect(() => {
  generateQRCode();
}, [waterQualityData]); // Regenerate when water quality changes

// Also generate when QR section becomes active
useEffect(() => {
  if (activeSection === 'qrGenerator') {
    setTimeout(() => {
      generateQRCode();
    }, 100);
  }
}, [activeSection]);




  // Initialize complaints
  useEffect(() => {
    setComplaints([
      {
        id: 1,
        title: 'Contaminated well',
        location: 'Village A',
        date: new Date().toLocaleDateString(),
        status: 'pending',
        description: 'Well water appears cloudy and has a foul smell.',
      },
      {
        id: 2,
        title: 'Broken water pump',
        location: 'Village B',
        date: new Date().toLocaleDateString(),
        status: 'in-progress',
        description: 'Community water pump not working.',
      },
    ]);
  }, []);

  // Update dashboard stats and chart data
  useEffect(() => {
    setDashboardStats([
      { label: t('phLevel'), value: waterQualityData.pH, unit: '', color: '#8884d8' },
      { label: t('tdsLevel'), value: waterQualityData.TDS, unit: 'ppm', color: '#82ca9d' },
      { label: t('temperature'), value: waterQualityData.temperature, unit: '°C', color: '#ffc658' },
      { label: t('turbidity'), value: waterQualityData.turbidity, unit: 'NTU', color: '#ff8042' },
      { label: t('dissolvedOxygen'), value: waterQualityData.dissolvedOxygen, unit: 'mg/L', color: '#00C49F' },
    ]);

    setChartData([
      { day: 'Mon', pH: 7.0, TDS: 300, temperature: 23 },
      { day: 'Tue', pH: 7.2, TDS: 320, temperature: 24 },
      { day: 'Wed', pH: 7.1, TDS: 310, temperature: 24 },
      { day: 'Thu', pH: 7.3, TDS: 330, temperature: 25 },
      { day: 'Fri', pH: 7.0, TDS: 305, temperature: 24 },
      { day: 'Sat', pH: 7.4, TDS: 340, temperature: 26 },
      { day: 'Sun', pH: 7.2, TDS: 325, temperature: 25 },
    ]);
  }, [waterQualityData, currentLanguage]);

  // Filter water bodies based on search
  const filteredWaterBodies = waterBodies.filter(body =>
    body.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render sections based on active tab
  const renderSection = () => {
    switch (activeSection) {
     


case 'dashboard':
  return (
    <div id="dashboard" className="content-section active">
     {/* Welcome Header with Live Timestamp */}
<div className="dashboard-header">
  <div className="welcome-section">
    <h1 className="greeting">
      Good {getTimeOfDay()}, User! 
      <span className="wave-emoji">👋</span>
    </h1>
    <div className="live-indicator">
      <span className="live-dot"></span>
      <p className="live-timestamp">
        {t('lastUpdated')}: {isClient ? currentTime : 'Loading...'}
      </p>
    </div>
  </div>
  
  <div className="header-actions">
    <div className="weather-widget">
      <span className="weather-icon">☀️</span>
      <div className="weather-info">
        <span className="weather-temp">32°C</span>
        <span className="weather-location">{t('villageAreaLabel')}</span>
      </div>
    </div>
    <button className="notification-badge" onClick={() => setActiveSection('alerts')}>
      <span className="notification-icon">🔔</span>
      <span className="notification-count">3</span>
    </button>
  </div>
</div>

      {/* Summary Stats Cards */}
      <div className="summary-strip">
        <div className="summary-card">
          <div className="summary-icon">🏭</div>
          <div className="summary-content">
            <span className="summary-label">Active Sensors</span>
            <span className="summary-value">12/12</span>
            <span className="summary-trend success">● All Online</span>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">🏘️</div>
          <div className="summary-content">
            <span className="summary-label">Villages Covered</span>
            <span className="summary-value">8</span>
            <span className="summary-trend">● 100% Coverage</span>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <span className="summary-label">Overall Quality</span>
            <span className="summary-value good">Excellent</span>
            <span className="summary-trend success">↑ 5% from yesterday</span>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">⏰</div>
          <div className="summary-content">
            <span className="summary-label">Next Check</span>
            <span className="summary-value">4:00 PM</span>
            <span className="summary-trend">● In 2 hours</span>
          </div>
        </div>
      </div>

      {/* 5 Value Boxes with Icons and Micro-interactions */}
      <div className="stats-grid">
        <div className="stat-card interactive">
          <div className="stat-icon-wrapper">
            <span className="stat-icon">🧪</span>
          </div>
          <h4>pH Level</h4>
          <div className="stat-value">7.2</div>
          <div className="stat-footer">
            <span className="stat-status stable">● Stable</span>
            <span className="stat-range">(6.5-8.5)</span>
          </div>
          <div className="mini-graph">
            <span className="bar" style={{height: '60%'}}></span>
            <span className="bar" style={{height: '75%'}}></span>
            <span className="bar active" style={{height: '72%'}}></span>
            <span className="bar" style={{height: '80%'}}></span>
            <span className="bar" style={{height: '65%'}}></span>
          </div>
        </div>

        <div className="stat-card interactive">
          <div className="stat-icon-wrapper">
            <span className="stat-icon">💧</span>
          </div>
          <h4>TDS Level</h4>
          <div className="stat-value">320 <span className="stat-unit">ppm</span></div>
          <div className="stat-footer">
            <span className="stat-status good">↑ Good</span>
            <span className="stat-range">(&lt;500)</span>
          </div>
          <div className="progress-circle">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path className="circle good"
                strokeDasharray="64, 100"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" className="percentage">64%</text>
            </svg>
          </div>
        </div>

        <div className="stat-card interactive">
          <div className="stat-icon-wrapper">
            <span className="stat-icon">🌡️</span>
          </div>
          <h4>Temperature</h4>
          <div className="stat-value">24 <span className="stat-unit">°C</span></div>
          <div className="stat-footer">
            <span className="stat-status normal">● Normal</span>
            <span className="stat-range">(20-25)</span>
          </div>
          <div className="temp-scale">
            <div className="temp-bar" style={{width: '60%'}}>
              <span className="temp-indicator">24°</span>
            </div>
          </div>
        </div>

        <div className="stat-card interactive">
          <div className="stat-icon-wrapper">
            <span className="stat-icon">🌊</span>
          </div>
          <h4>Turbidity</h4>
          <div className="stat-value">0.8 <span className="stat-unit">NTU</span></div>
          <div className="stat-footer">
            <span className="stat-status good">↓ Clear</span>
            <span className="stat-range">(&lt;1.0)</span>
          </div>
          <div className="wave-animation">
            <span className="wave">~</span>
            <span className="wave">~~</span>
            <span className="wave">~~~</span>
          </div>
        </div>

        <div className="stat-card interactive">
          <div className="stat-icon-wrapper">
            <span className="stat-icon">🫧</span>
          </div>
          <h4>Dissolved Oxygen</h4>
          <div className="stat-value">6.5 <span className="stat-unit">mg/L</span></div>
          <div className="stat-footer">
            <span className="stat-status good">↑ Healthy</span>
            <span className="stat-range">(&gt;5.0)</span>
          </div>
          <div className="bubble-animation">
            <span className="bubble">○</span>
            <span className="bubble">○</span>
            <span className="bubble">○</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="quick-actions">
        <button className="action-btn primary" onClick={refreshWaterQualityData}>
          <span className="action-icon">🔄</span>
          Refresh Data
        </button>
        <button className="action-btn" onClick={() => downloadReport()}>
          <span className="action-icon">📥</span>
          Download Report
        </button>
        <button className="action-btn" onClick={() => shareDashboard()}>
          <span className="action-icon">📤</span>
          Share
        </button>
        <button className="action-btn" onClick={() => setActiveSection('alerts')}>
          <span className="action-icon">🔔</span>
          View Alerts
        </button>
      </div>

      {/* Two columns - Chart and ML Prediction */}
      <div className="charts-section">
        {/* Weekly Trend Chart with Enhanced Features */}
        <div className="chart-container enhanced">
          <div className="chart-header">
            <h3>
              <span className="chart-icon">📊</span>
              Weekly Water Quality Trend
            </h3>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-dot ph"></span>
                <span>pH Level</span>
                <span className="legend-value">7.2 avg</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot tds"></span>
                <span>TDS (ppm)</span>
                <span className="legend-value">320 avg</span>
              </div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis yAxisId="left" stroke="#6b7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }} 
              />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="pH" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6, fill: '#2563eb' }}
                name="pH"
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="TDS" 
                stroke="#22c55e" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#22c55e' }}
                activeDot={{ r: 6, fill: '#16a34a' }}
                name="TDS (ppm)"
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="chart-footer">
            <div className="stat-chip">
              <span className="chip-label">Min pH:</span>
              <span className="chip-value">6.8</span>
            </div>
            <div className="stat-chip">
              <span className="chip-label">Max pH:</span>
              <span className="chip-value">7.4</span>
            </div>
            <div className="stat-chip">
              <span className="chip-label">Avg TDS:</span>
              <span className="chip-value">315 ppm</span>
            </div>
          </div>
        </div>

        {/* Enhanced ML Prediction Card */}
        <div className="chart-container enhanced">
          <h3>
            <span className="chart-icon">🤖</span>
            AI Quality Prediction
          </h3>
          
          <div className="ml-prediction-card enhanced">
            {/* Gauge Chart */}
            <div className="gauge-container">
              <div className="gauge">
                <div className="gauge-body">
                  <div className="gauge-fill" style={{ transform: 'rotate(135deg)' }}></div>
                  <div className="gauge-center">
                    <span className="gauge-value">95%</span>
                    <span className="gauge-label">Confidence</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="quality-badge good pulse-animation">
              <span className="badge-icon">✅</span>
              Water is Safe
            </div>

            <div className="insight-card">
              <p className="insight-text">
                <span className="insight-icon">💡</span>
                Water quality is excellent. Regular monitoring recommended every 2 weeks.
              </p>
            </div>

            {/* Quality Metrics */}
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">pH Balance</span>
                <div className="metric-bar">
                  <div className="metric-fill" style={{width: '85%'}}></div>
                </div>
                <span className="metric-value">Good</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Purity</span>
                <div className="metric-bar">
                  <div className="metric-fill" style={{width: '92%'}}></div>
                </div>
                <span className="metric-value">Excellent</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Minerals</span>
                <div className="metric-bar">
                  <div className="metric-fill" style={{width: '78%'}}></div>
                </div>
                <span className="metric-value">Optimal</span>
              </div>
            </div>

            {/* Next Check Reminder */}
            <div className="reminder-card">
              <span className="reminder-icon">⏰</span>
              <div className="reminder-content">
                <span className="reminder-label">Next scheduled check:</span>
                <span className="reminder-time">Today 4:00 PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Widgets */}
      <div className="dashboard-widgets">
        {/* Recent Alerts Widget */}
        <div className="widget">
          <div className="widget-header">
            <h4>🔔 Recent Alerts</h4>
            <button className="widget-more" onClick={() => setActiveSection('alerts')}>View all →</button>
          </div>
          <div className="alert-ticker">
            <div className="ticker-item">
              <span className="ticker-dot warning"></span>
              <span className="ticker-text">pH fluctuation in Village B</span>
              <span className="ticker-time">5m ago</span>
            </div>
            <div className="ticker-item">
              <span className="ticker-dot success"></span>
              <span className="ticker-text">Sensor calibrated in Village A</span>
              <span className="ticker-time">1h ago</span>
            </div>
            <div className="ticker-item">
              <span className="ticker-dot info"></span>
              <span className="ticker-text">Maintenance scheduled</span>
              <span className="ticker-time">2h ago</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Widget */}
        <div className="widget">
          <div className="widget-header">
            <h4>📈 Today's Stats</h4>
          </div>
          <div className="stats-row">
            <div className="stat-block">
              <span className="stat-name">Samples tested</span>
              <span className="stat-number">24</span>
            </div>
            <div className="stat-block">
              <span className="stat-name">Pass rate</span>
              <span className="stat-number success">98%</span>
            </div>
          </div>
          <div className="progress-stats">
            <div className="progress-item">
              <span>Good</span>
              <div className="progress">
                <div className="progress-bar good" style={{width: '75%'}}></div>
              </div>
              <span>75%</span>
            </div>
            <div className="progress-item">
              <span>Moderate</span>
              <div className="progress">
                <div className="progress-bar moderate" style={{width: '20%'}}></div>
              </div>
              <span>20%</span>
            </div>
            <div className="progress-item">
              <span>Poor</span>
              <div className="progress">
                <div className="progress-bar poor" style={{width: '5%'}}></div>
              </div>
              <span>5%</span>
            </div>
          </div>
        </div>

        {/* Achievement Widget */}
        <div className="widget achievement">
          <div className="achievement-icon">🏆</div>
          <div className="achievement-content">
            <span className="achievement-title">7 Day Streak!</span>
            <span className="achievement-desc">Perfect monitoring record</span>
            <div className="streak-dots">
              <span className="dot active"></span>
              <span className="dot active"></span>
              <span className="dot active"></span>
              <span className="dot active"></span>
              <span className="dot active"></span>
              <span className="dot active"></span>
              <span className="dot active"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );



      case 'mapSection':
        return (
          <div id="mapSection" className="content-section active">
            <h2> {t('navMap')}</h2>
            <p className="section-description">View villages and water bodies on the interactive map</p>
            
            <div className="map-controls">
              <button className="btn btn-primary" onClick={getLocation}>
                 {t('getLocation')}
              </button>
              <button className="btn btn-secondary" onClick={findWaterBodies}>
                 {t('findWaterBodies')}
              </button>
              <button className="btn btn-warning" onClick={clearWaterBodies}>
                 {t('clearWaterBodies')}
              </button>\
              <button className="btn btn-success" onClick={refreshNearbyWaterBodies}>
  🔄 Refresh Nearby Water Bodies
</button>
            </div>
            
            <VillageMap
  villages={villageHeads}
  waterBodies={waterBodies}
  center={mapCenter}
  zoom={mapZoom}
  onVillageSelect={(village) => {
    console.log('Selected village:', village);
    setSelectedVillage(village.village);
  }}
  onWaterBodySelect={(body) => {
    console.log('Selected water body:', body);
  }}
/>

            <div className="water-body-info" style={{ marginTop: '2rem' }}>
              <h3>{t('nearbyWaterBodies')}</h3>
              <input
                type="text"
                placeholder="Search water bodies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <div className="water-body-grid">
                {waterBodies.length > 0 ? (
                  waterBodies.map(body => (
                    <div key={body.id} className="water-body-card">
                      <h4>{body.name}</h4>
                      <p>📍 {body.distance}</p>
                      <p>💧 {body.type}</p>
                      <p>📊 Quality: {body.quality}</p>
                      <p>🧪 pH: {body.pH}</p>
                    </div>
                  ))
                ) : (
                  <p>{t('noWaterBodies')}</p>
                )}
              </div>
            </div>
          </div>
        );



      case 'analytics':
        return (
          <div id="analytics" className="content-section active">
            <h2>📈 {t('villageComparison')}</h2>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Village A</h3>
                <p>pH: 7.2 (Good)</p>
                <p>TDS: 320 ppm</p>
                <p>Temperature: 24°C</p>
              </div>
              <div className="analytics-card">
                <h3>Village B</h3>
                <p>pH: 6.8 (Moderate)</p>
                <p>TDS: 450 ppm</p>
                <p>Temperature: 25°C</p>
              </div>
              <div className="analytics-card">
                <h3>Village C</h3>
                <p>pH: 7.5 (Good)</p>
                <p>TDS: 280 ppm</p>
                <p>Temperature: 23°C</p>
              </div>
            </div>
            
            <div className="chart-container">
              <h3>Water Quality Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="temperature" stroke="#ff7300" name="Temperature" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

  case 'alerts':
  // Get filtered alerts
  const filteredAlerts = getFilteredAlerts();
  // Get counts for each type
  const criticalCount = alerts.filter(a => a.type === 'critical').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const infoCount = alerts.filter(a => a.type === 'info').length;
  
  return (
    <div id="alerts" className="content-section active">
      {/* Alert Summary Dashboard */}
      <div className="alert-summary">
        <div className={`summary-stat critical ${alertFilter === 'critical' ? 'active-filter' : ''}`} 
             onClick={() => setAlertFilter('critical')}
             style={{ cursor: 'pointer' }}>
          <span className="stat-value">{criticalCount}</span>
          <span className="stat-label">Critical</span>
        </div>
        <div className={`summary-stat warning ${alertFilter === 'warning' ? 'active-filter' : ''}`}
             onClick={() => setAlertFilter('warning')}
             style={{ cursor: 'pointer' }}>
          <span className="stat-value">{warningCount}</span>
          <span className="stat-label">Warnings</span>
        </div>
        <div className={`summary-stat info ${alertFilter === 'info' ? 'active-filter' : ''}`}
             onClick={() => setAlertFilter('info')}
             style={{ cursor: 'pointer' }}>
          <span className="stat-value">{infoCount}</span>
          <span className="stat-label">Info</span>
        </div>
        <div className={`summary-stat total ${alertFilter === 'all' ? 'active-filter' : ''}`}
             onClick={() => setAlertFilter('all')}
             style={{ cursor: 'pointer' }}>
          <span className="stat-value">{alerts.length}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      {/* Alert Timeline/Feed */}
      <div className="alert-timeline">
        <div className="timeline-header">
          <h3>
            <span className="header-icon">⏱️</span>
            Live Alert Feed
          </h3>
          <div className="timeline-controls">
            <button 
              className={`filter-btn ${alertFilter === 'all' ? 'active' : ''}`}
              onClick={() => setAlertFilter('all')}>
              All ({alerts.length})
            </button>
            <button 
              className={`filter-btn ${alertFilter === 'critical' ? 'active' : ''}`}
              onClick={() => setAlertFilter('critical')}>
              Critical ({criticalCount})
            </button>
            <button 
              className={`filter-btn ${alertFilter === 'warning' ? 'active' : ''}`}
              onClick={() => setAlertFilter('warning')}>
              Warnings ({warningCount})
            </button>
            <button 
              className={`filter-btn ${alertFilter === 'info' ? 'active' : ''}`}
              onClick={() => setAlertFilter('info')}>
              Info ({infoCount})
            </button>
          </div>
        </div>

        <div className="alerts-list enhanced">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert, index) => (
              <div key={alert.id} className={`alert-card enhanced alert-${alert.type}`}>
                {index < filteredAlerts.length - 1 && <div className="timeline-line"></div>}
                
                <div className="alert-time-badge">
                  <span className="time-dot"></span>
                  <span className="time-text">{alert.time}</span>
                </div>

                <div className="alert-icon-wrapper">
                  <div className="alert-icon-large">
                    {alert.type === 'critical' && '🚨'}
                    {alert.type === 'warning' && '⚠️'}
                    {alert.type === 'info' && 'ℹ️'}
                  </div>
                </div>

                <div className="alert-content enhanced">
                  <div className="alert-header">
                    <h4>{alert.message}</h4>
                    <span className={`alert-type-badge ${alert.type}`}>
                      {alert.type === 'critical' ? 'Critical' : 
                       alert.type === 'warning' ? 'Warning' : 'Information'}
                    </span>
                  </div>
                  
                  <p className="alert-location">
                    <span className="location-icon">📍</span>
                    {alert.location || 'Village Area'}
                  </p>

                  <div className="alert-actions">
                    <button className="action-btn small" onClick={() => handleAcknowledge(alert.id)}>
                      <span className="btn-icon">✓</span>
                      Acknowledge
                    </button>
                    <button className="action-btn small" onClick={() => speakText(alert.message)}>
                      <span className="btn-icon">🔊</span>
                      Speak
                    </button>
                  </div>
                </div>

                <div className="severity-meter">
                  <div className={`severity-fill ${alert.type}`} style={{
                    width: alert.type === 'critical' ? '100%' : 
                           alert.type === 'warning' ? '60%' : '30%'
                  }}></div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No Alerts Found</h3>
              <p>No {alertFilter !== 'all' ? alertFilter : ''} alerts at the moment</p>
            </div>
          )}
        </div>
      </div>

      {/* Voice Alert System */}
      <div className="voice-control-center">
        <div className="voice-header">
          <h3>
            <span className="header-icon">🎤</span>
            Voice Alert System
          </h3>
          <div className="voice-status">
            <span className={`status-indicator ${voiceAlertsEnabled ? 'active' : 'inactive'}`}></span>
            <span>{voiceAlertsEnabled ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        <div className="voice-controls-grid">
          {/* Main Toggle */}
          <div className="voice-card main-toggle">
            <div className="voice-icon">🎤</div>
            <div className="voice-info">
              <span className="voice-label">Voice Alerts</span>
              <span className="voice-desc">Enable/disable voice notifications</span>
            </div>
            <label className="toggle-switch large">
              <input 
                type="checkbox" 
                checked={voiceAlertsEnabled}
                onChange={(e) => toggleVoiceAlerts(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Test Voice Button */}
          <div className="voice-card test-voice">
            <div className="voice-icon">🔊</div>
            <div className="voice-info">
              <span className="voice-label">Test Voice</span>
              <span className="voice-desc">Preview voice alert</span>
            </div>
            <button className="test-btn" onClick={testVoiceAlert}>
              <span className="btn-icon">▶️</span>
              Test
            </button>
          </div>

          {/* Voice Status */}
          <div className="voice-card status">
            <div className="voice-icon">📊</div>
            <div className="voice-info">
              <span className="voice-label">Queue Status</span>
              <span className="voice-desc">
                {isSpeaking ? 'Speaking...' : voiceQueue.length > 0 ? `${voiceQueue.length} pending` : 'Idle'}
              </span>
            </div>
            <span className="status-badge">
              {isSpeaking ? '🔊' : '⏸️'}
            </span>
          </div>

          {/* Voice History */}
          <div className="voice-card history">
            <div className="voice-icon">📋</div>
            <div className="voice-info">
              <span className="voice-label">Today's Announcements</span>
              <span className="voice-desc">
                {Object.keys(lastSpoken).length} spoken
              </span>
            </div>
            <span className="history-count">{Object.keys(lastSpoken).length}</span>
          </div>
        </div>

        {/* Voice Schedule */}
        <div className="voice-schedule">
          <h4>
            <span>⏰ Scheduled Voice Announcements</span>
            <span className="schedule-note">(Automatic - runs every minute)</span>
          </h4>
          <div className="schedule-list">
            {voiceSchedule.map(item => (
              <div key={item.id} className="schedule-item">
                <span className="schedule-time">{item.time}</span>
                <span className="schedule-message">{item.message}</span>
                <label className="toggle-switch small">
                  <input 
                    type="checkbox" 
                    checked={item.enabled}
                    onChange={(e) => {
                      setVoiceSchedule(prev => 
                        prev.map(s => s.id === item.id ? {...s, enabled: e.target.checked} : s)
                      );
                    }}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Live Voice Activity */}
        {voiceQueue.length > 0 && (
          <div className="voice-activity">
            <div className="activity-header">
              <span className="activity-icon">🔊</span>
              <span className="activity-text">Speaking in queue...</span>
            </div>
            <div className="queue-list">
              {voiceQueue.map((msg, idx) => (
                <div key={idx} className="queue-item">
                  <span className="queue-number">{idx + 1}.</span>
                  <span className="queue-message">{msg.substring(0, 50)}...</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
        case 'qrGenerator':
  return (
    <div id="qrGenerator" className="content-section active">
      <div className="qr-generator-container">
        <div className="qr-header">
          <h1>
            <span className="qr-logo">🌊</span> 
            {t('appName')} QR Code
          </h1>
          <p>Scan this QR code to view current water quality information on any device</p>
        </div>

        <div className="qr-content">
          {/* Left side - QR Code */}
          <div className="qr-display">
            <div className="qr-card">
              <canvas
                ref={canvasRef}
                id="qrCanvas"
                width="250"
                height="250"
              ></canvas>
              <div className="qr-badge">
                <span className="qr-date">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <div className="qr-actions">
              <button className="btn btn-primary" onClick={generateQRCode}>
                <span className="btn-icon">🔄</span>
                Regenerate
              </button>
              <button className="btn btn-secondary" onClick={downloadQRCode}>
                <span className="btn-icon">⬇️</span>
                Download PNG
              </button>
            </div>
          </div>

          {/* Right side - Water Quality Info */}
          <div className="qr-info">
            <div className="water-quality-card">
              <div className="info-header">
                <h3>Current Water Status</h3>
                <div className={`quality-badge-large quality-${waterQualityData.quality.toLowerCase()}`}>
                  <span className="quality-icon">
                    {waterQualityData.quality === 'Good' ? '✅' : 
                     waterQualityData.quality === 'Moderate' ? '⚠️' : '❌'}
                  </span>
                  {waterQualityData.quality}
                </div>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">
                    <span className="info-icon">🧪</span>
                    pH Level
                  </span>
                  <span className="info-value">{waterQualityData.pH}</span>
                  <span className="info-range">(6.5-8.5)</span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">
                    <span className="info-icon">💧</span>
                    TDS Level
                  </span>
                  <span className="info-value">{waterQualityData.TDS} <small>ppm</small></span>
                  <span className="info-range">(&lt;500)</span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">
                    <span className="info-icon">🌡️</span>
                    Temperature
                  </span>
                  <span className="info-value">{waterQualityData.temperature} <small>°C</small></span>
                  <span className="info-range">(20-25)</span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">
                    <span className="info-icon">🌊</span>
                    Turbidity
                  </span>
                  <span className="info-value">{waterQualityData.turbidity} <small>NTU</small></span>
                  <span className="info-range">(&lt;1.0)</span>
                </div>

                <div className="info-item">
                  <span className="info-label">
                    <span className="info-icon">🫧</span>
                    Dissolved O₂
                  </span>
                  <span className="info-value">{waterQualityData.dissolvedOxygen} <small>mg/L</small></span>
                  <span className="info-range">(&gt;5.0)</span>
                </div>

                <div className="info-item">
                  <span className="info-label">
                    <span className="info-icon">📍</span>
                    Location
                  </span>
                  <span className="info-value">{waterQualityData.location}</span>
                </div>
              </div>

              <div className="info-footer">
                <span className="timestamp">
                  ⏰ Last Updated: {waterQualityData.lastUpdated}
                </span>
              </div>
            </div>

            {/* Test Controls */}
            <div className="test-controls">
              <h4>🧪 Test Different Water Conditions</h4>
              <div className="test-buttons">
                <button 
                  className="test-btn good" 
                  onClick={() => simulateWaterCondition('good')}
                  title="Simulate good water quality"
                >
                  <span className="test-icon">✅</span>
                  Good
                </button>
                <button 
                  className="test-btn moderate" 
                  onClick={() => simulateWaterCondition('moderate')}
                  title="Simulate moderate water quality"
                >
                  <span className="test-icon">⚠️</span>
                  Moderate
                </button>
                <button 
                  className="test-btn poor" 
                  onClick={() => simulateWaterCondition('poor')}
                  title="Simulate poor water quality"
                >
                  <span className="test-icon">❌</span>
                  Poor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
      // case 'qrGenerator':
      //   return (
      //     <div id="qrGenerator" className="content-section active">
      //       <div className="qr-generator-container">
      //         <h1>🌊 {t('appName')} QR Code</h1>
      //         <p>Scan this QR code to view current water quality information</p>

      //         <div className="water-quality-info">
      //           <h3>Current Water Status</h3>
      //           <div className={`quality-indicator quality-${waterQualityData.quality.toLowerCase()}`}>
      //             {waterQualityData.quality}
      //           </div>

      //           <div className="status-grid">
      //             <div className="status-item">
      //               <span className="status-label">{t('phLevel')}:</span>
      //               <span className="status-value">{waterQualityData.pH}</span>
      //             </div>
      //             <div className="status-item">
      //               <span className="status-label">{t('tdsLevel')}:</span>
      //               <span className="status-value">{waterQualityData.TDS} ppm</span>
      //             </div>
      //             <div className="status-item">
      //               <span className="status-label">{t('temperature')}:</span>
      //               <span className="status-value">{waterQualityData.temperature}°C</span>
      //             </div>
      //             <div className="status-item">
      //               <span className="status-label">{t('turbidity')}:</span>
      //               <span className="status-value">{waterQualityData.turbidity} NTU</span>
      //             </div>
      //           </div>
      //         </div>

      //         <div className="qr-code">
      //           <canvas
      //             ref={canvasRef}
      //             id="qrCanvas"
      //             width="200"
      //             height="200"
      //             style={{ border: '1px solid #ddd' }}
      //           ></canvas>
      //         </div>

      //         <div className="qr-actions">
      //           <button className="btn btn-primary" onClick={generateQRCode}>
      //             🔄 Generate QR Code
      //           </button>
      //           <button className="btn btn-secondary" onClick={downloadQRCode}>
      //             ⬇️ Download QR
      //           </button>
      //         </div>

      //         <div className="simulation-controls">
      //           <h4>🧪 Test Different Water Conditions</h4>
      //           <button className="btn btn-success" onClick={() => simulateWaterCondition('good')}>
      //             Good Quality
      //           </button>
      //           <button className="btn btn-warning" onClick={() => simulateWaterCondition('moderate')}>
      //             Moderate Quality
      //           </button>
      //           <button className="btn btn-danger" onClick={() => simulateWaterCondition('poor')}>
      //             Poor Quality
      //           </button>
      //         </div>
      //       </div>
      //     </div>
      //   );

     case 'game':
  return (
    <div id="game" className="content-section active">
      <div className="game-header">
        <h2>
          <span className="game-icon">🧪</span>
          pH Learning Game
        </h2>
        <p className="game-subtitle">Test your knowledge about water quality and pH levels</p>
      </div>

      {/* Game Stats Overview */}
      <div className="game-stats">
        <div className="stat-item">
          <span className="stat-icon">📊</span>
          <div className="stat-info">
            <span className="stat-label">Score</span>
            <span className="stat-value">{quizState.score}/{quizQuestions.length}</span>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">❓</span>
          <div className="stat-info">
            <span className="stat-label">Question</span>
            <span className="stat-value">{quizState.currentQuestion + 1}/{quizQuestions.length}</span>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">⭐</span>
          <div className="stat-info">
            <span className="stat-label">Progress</span>
            <span className="stat-value">{Math.round((quizState.currentQuestion / quizQuestions.length) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="game-area">
        {quizState.currentQuestion < quizQuestions.length ? (
          <>
            {/* pH Scale Visual Indicator */}
            <div className="ph-scale-visual">
              <div className="ph-scale-bar">
                <div className="ph-marker" style={{ 
                  left: `${getPhPosition(quizQuestions[quizState.currentQuestion])}%` 
                }}>
                  <span className="marker-tooltip">Current Question pH</span>
                </div>
              </div>
              <div className="ph-labels">
                <span className="ph-label acidic">Acidic</span>
                <span className="ph-label neutral">Neutral</span>
                <span className="ph-label alkaline">Alkaline</span>
              </div>
            </div>

            {/* Question Card */}
            <div className="question-card">
              <div className="question-badge">
                <span className="badge-icon">🔬</span>
                <span className="badge-text">Question {quizState.currentQuestion + 1}</span>
              </div>
              
              <h3 className="question-text">
                {quizQuestions[quizState.currentQuestion].question}
              </h3>

              {/* Progress Bar */}
              <div className="question-progress">
                <div 
                  className="progress-fill" 
                  style={{ width: `${((quizState.currentQuestion + 1) / quizQuestions.length) * 100}%` }}
                ></div>
              </div>

              {/* Answer Options */}
              <div className="options-grid">
                {quizQuestions[quizState.currentQuestion].options.map((option, idx) => {
                  const isCorrect = idx === quizQuestions[quizState.currentQuestion].correct;
                  const isSelected = quizState.selectedOption === idx;
                  
                  return (
                    <button
                      key={idx}
                      className={`option-card 
                        ${quizState.answered && isSelected ? (isCorrect ? 'correct' : 'incorrect') : ''}
                        ${!quizState.answered ? 'hoverable' : ''}
                      `}
                      onClick={() => handleAnswer(idx)}
                      disabled={quizState.answered}
                    >
                      <div className="option-content">
                        <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                        <span className="option-text">{option}</span>
                        {quizState.answered && isSelected && (
                          <span className="option-icon">
                            {isCorrect ? '✅' : '❌'}
                          </span>
                        )}
                      </div>
                      
                      {/* Answer Explanation (shown after answering) */}
                      {quizState.answered && isSelected && (
                        <div className="option-feedback">
                          {isCorrect ? (
                            <span className="feedback correct">
                              ✓ Correct! Great job!
                            </span>
                          ) : (
                            <span className="feedback incorrect">
                              ✗ Oops! The correct answer is: {quizQuestions[quizState.currentQuestion].options[quizQuestions[quizState.currentQuestion].correct]}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="game-actions">
                {quizState.answered && quizState.currentQuestion < quizQuestions.length - 1 && (
                  <button className="btn-next" onClick={nextQuestion}>
                    <span className="btn-icon">➡️</span>
                    Next Question
                  </button>
                )}
                
                {quizState.answered && quizState.currentQuestion === quizQuestions.length - 1 && (
                  <button className="btn-finish" onClick={restartQuiz}>
                    <span className="btn-icon">🏆</span>
                    See Results
                  </button>
                )}
              </div>

              {/* Live Feedback Message */}
              {quizState.answered && (
                <div className={`feedback-message ${quizState.selectedOption === quizQuestions[quizState.currentQuestion].correct ? 'success' : 'error'}`}>
                  <div className="feedback-icon">
                    {quizState.selectedOption === quizQuestions[quizState.currentQuestion].correct ? '🎉' : '💡'}
                  </div>
                  <div className="feedback-text">
                    {quizState.selectedOption === quizQuestions[quizState.currentQuestion].correct ? (
                      <>
                        <strong>Excellent!</strong> You're learning fast!
                      </>
                    ) : (
                      <>
                        <strong>Keep learning!</strong> The correct answer is: {quizQuestions[quizState.currentQuestion].options[quizQuestions[quizState.currentQuestion].correct]}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Learning Tip */}
            <div className="learning-tip">
              <span className="tip-icon">💡</span>
              <span className="tip-text">
                {getLearningTip(quizState.currentQuestion)}
              </span>
            </div>
          </>
        ) : (
          // Quiz Complete Screen
          <div className="quiz-complete">
            <div className="completion-animation">
              <span className="trophy">🏆</span>
            </div>
            
            <h2 className="completion-title">Quiz Complete!</h2>
            
            <div className="score-circle">
              <svg viewBox="0 0 120 120" className="score-svg">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={getScoreColor(quizState.score, quizQuestions.length)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={2 * Math.PI * 54 * (1 - quizState.score / quizQuestions.length)}
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="70" textAnchor="middle" className="score-text">
                  {quizState.score}/{quizQuestions.length}
                </text>
              </svg>
            </div>

            <div className="result-message">
              <p className="score-percentage">
                {Math.round((quizState.score / quizQuestions.length) * 100)}% Correct
              </p>
              <p className="encouragement">
                {getEncouragementMessage(quizState.score, quizQuestions.length)}
              </p>
            </div>

            <div className="result-stats">
              <div className="result-stat">
                <span className="stat-label">Correct Answers</span>
                <span className="stat-value good">{quizState.score}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">Wrong Answers</span>
                <span className="stat-value bad">{quizQuestions.length - quizState.score}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">Accuracy</span>
                <span className="stat-value neutral">
                  {Math.round((quizState.score / quizQuestions.length) * 100)}%
                </span>
              </div>
            </div>

            <div className="completion-actions">
              <button className="btn-restart" onClick={restartQuiz}>
                <span className="btn-icon">🔄</span>
                Play Again
              </button>
              <button className="btn-share" onClick={() => shareScore()}>
                <span className="btn-icon">📤</span>
                Share Score
              </button>
            </div>

            {/* Achievement Badge */}
            {quizState.score === quizQuestions.length && (
              <div className="achievement-unlocked">
                <span className="achievement-icon">🏅</span>
                <span className="achievement-text">Perfect Score! Achievement Unlocked!</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Game Footer with Tips */}
      <div className="game-footer">
        <div className="quick-tips">
          <h4>📚 Quick pH Facts</h4>
          <div className="tips-carousel">
            <div className="tip-item">
              <span className="tip-dot"></span>
              <span>pH 7 is neutral (pure water)</span>
            </div>
            <div className="tip-item">
              <span className="tip-dot"></span>
              <span>pH below 7 is acidic</span>
            </div>
            <div className="tip-item">
              <span className="tip-dot"></span>
              <span>pH above 7 is alkaline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
     case 'villageHeads':
  return (
    <div id="villageHeads" className="content-section active">
      {/* Header with Stats */}
      <div className="section-header">
        <div className="header-title">
          <h2>
            <span className="header-icon"></span>
            {t('navVillageHeads')}
          </h2>
          <p className="section-description">Meet your village representatives and community leaders</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-number">{villageHeads.length}</span>
            <span className="stat-label">Total Heads</span>
          </div>
          <div className="stat-badge">
            <span className="stat-number">{villageHeads.filter(v => v.waterQuality === 'Good').length}</span>
            <span className="stat-label">Good Quality</span>
          </div>
        </div>
      </div>

      {/* Village Heads Grid */}
      <div className="village-heads-grid enhanced">
        {villageHeads.map((head, index) => (
          <div key={head.id} className="village-head-card enhanced" style={{ animationDelay: `${index * 0.1}s` }}>
            {/* Card Header with Quality Indicator */}
            <div className="card-header">
              <div className={`quality-tag ${head.waterQuality?.toLowerCase() || 'good'}`}>
                {head.waterQuality || 'Good'}
              </div>
              <div className="head-avatar large">
                {head.name.charAt(0)}
              </div>
            </div>

            {/* Head Info */}
            <div className="head-info">
              <h3 className="head-name">{head.name}</h3>
              <p className="head-village">
                <span className="info-icon">🏘️</span>
                {head.village}
              </p>
            </div>

            {/* Contact Details */}
            <div className="contact-details">
              <div className="detail-item">
                <span className="detail-icon">📞</span>
                <span className="detail-text">{head.contact}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">📅</span>
                <span className="detail-text">{t('since')}: {head.since}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="card-actions">
              <button className="btn-contact" onClick={() => handleContact(head)}>
                <span className="btn-icon">📞</span>
                {t('contact')}
              </button>
              <button className="btn-profile" onClick={() => viewProfile(head)}>
                <span className="btn-icon">👤</span>
                Profile
              </button>
            </div>

            {/* Quick Contact Options */}
            <div className="quick-contact">
              <button className="quick-contact-btn" title="Call" onClick={() => window.open(`tel:${head.contact}`)}>
                📞
              </button>
              <button className="quick-contact-btn" title="Message" onClick={() => window.open(`sms:${head.contact}`)}>
                💬
              </button>
              <button className="quick-contact-btn" title="WhatsApp" onClick={() => window.open(`https://wa.me/${head.contact.replace(/\D/g,'')}`)}>
                📱
              </button>
            </div>

            {/* Decorative Elements */}
            <div className="card-pattern"></div>
          </div>
        ))}
      </div>

      {/* Empty State (if no village heads) */}
      {villageHeads.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No Village Heads Found</h3>
          <p>There are no village heads registered in the system yet.</p>
          <button className="btn btn-primary" onClick={() => addNewHead()}>
            <span className="btn-icon">➕</span>
            Add New Head
          </button>
        </div>
      )}

      {/* Additional Info Card */}
      <div className="info-card">
        <div className="info-card-icon">💡</div>
        <div className="info-card-content">
          <h4>About Village Heads</h4>
          <p>Village heads are your primary point of contact for water quality concerns. Reach out to them for:</p>
          <ul className="info-list">
            <li>🚰 Reporting water quality issues</li>
            <li>📋 Community meeting updates</li>
            <li>🔧 Maintenance requests</li>
            <li>📊 Water quality data access</li>
          </ul>
        </div>
      </div>
    </div>
  );
    






case 'education':
  return (
    <div id="education" className="content-section active">
      <div className="education-header">
        <h2>📚 {t('navEducation')}</h2>
        <p>Learn about water quality through videos, infographics, and articles</p>
      </div>
      
      {/* Videos Section */}
      <div className="education-section">
        <h3>
          <span className="section-icon">🎥</span>
          {t('awarenessVideos')}
        </h3>
        <div className="videos-grid">
          {educationContent.videos.map(video => (
            <div key={video.id} className="video-card">
  <div className="video-thumbnail">
    <div className="thumbnail-bg">{video.thumbnail}</div>
    <div className="play-overlay">
      <span className="play-icon">▶️</span>
    </div>
  </div>
  <h4>{video.title}</h4>
  <p>
    <span className="duration-icon">⏱️</span>
    {video.duration}
  </p>
  <button 
    className="btn-watch" 
    onClick={() => {
      console.log('Button clicked for:', video.title);
      openVideoModal(video);
    }}
  >
    <span className="btn-icon">▶️</span>
    Watch Now
  </button>
</div>
          ))}
        </div>
      </div>

      {/* Infographics Section - Same as before */}
      <div className="education-section">
        <h3>
          <span className="section-icon">📊</span>
          {t('infographics')}
        </h3>
        <div className="infographics-grid">
          {educationContent.infographics.map(item => (
            <div key={item.id} className="infographic-card">
              <div className="infographic-icon-wrapper">
                <span className="infographic-icon">{item.icon}</span>
              </div>
              <h4>{item.title}</h4>
              <p className="infographic-desc">Learn about {item.title.toLowerCase()} and water quality</p>
              <button className="btn-download" onClick={() => downloadInfographic(item)}>
                <span className="btn-icon">⬇️</span>
                {t('download')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Articles Section - Same as before */}
      <div className="education-section">
        <h3>
          <span className="section-icon">📖</span>
          {t('learningResources')}
        </h3>
        <div className="articles-list">
          {educationContent.articles.map(article => (
            <div key={article.id} className="article-item">
              <div className="article-content">
                <h4>{article.title}</h4>
                <div className="article-meta">
                  <span>
                    <span className="meta-icon">📖</span>
                    {article.readTime} read
                  </span>
                  <span>
                    <span className="meta-icon">👁️</span>
                    150 views
                  </span>
                </div>
              </div>
              <button className="btn-read" onClick={() => readArticle(article)}>
                <span className="btn-icon">📖</span>
                {t('readMore')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal with YouTube Embed */}
         {/* Video Modal with YouTube Embed */}
      {showVideoModal && selectedVideo && (
        <div className="modal-overlay" onClick={closeVideoModal}>
          <div className="modal-content video-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedVideo.title}</h3>
              <button className="modal-close" onClick={closeVideoModal}>✕</button>
            </div>
            <div className="video-player-container">
              <iframe
                width="100%"
                height="315"
                src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1&rel=0`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="video-info">
              <p className="video-description">
                Learn about {selectedVideo.title.toLowerCase()} and how it affects water quality.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeVideoModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );














case 'health':
  return (
    <div id="health" className="content-section active">
      <div className="health-header">
        <h2> {t('navHealth')}</h2>
        <p>Access health resources and emergency contacts for water-related illnesses</p>
      </div>

      {/* Health Resources Grid */}
      <div className="health-resources-grid">
        {healthResources.map(resource => (
          <div key={resource.id} className="health-card" onClick={() => viewHealthDetails(resource)}>
            <div className="health-icon">{resource.icon}</div>
            <h3>{resource.title}</h3>
            <p>{resource.description}</p>
            <button className="btn-view" onClick={(e) => {
              e.stopPropagation();
              viewHealthDetails(resource);
            }}>
              <span className="btn-icon">👁️</span>
              {t('viewDetails')}
            </button>
          </div>
        ))}
      </div>

      {/* Health Tips Section */}
      <div className="health-tips">
        <h3>💡 Health Tips</h3>
        <ul>
          <li>Always boil water if quality is uncertain</li>
          <li>Wash hands before handling drinking water</li>
          <li>Store water in clean, covered containers</li>
          <li>Report any water-borne illness immediately</li>
          <li>Use water filters for additional safety</li>
          <li>Check water quality regularly</li>
        </ul>
      </div>

      {/* Emergency Contacts Section */}
      <div className="emergency-contacts">
        <h3>📞 Emergency Contacts</h3>
        <div className="contacts-grid">
          <div className="contact-item" onClick={() => window.open('tel:108')}>
            <div className="contact-icon">🚑</div>
            <div className="contact-info">
              <span className="contact-name">Ambulance</span>
              <span className="contact-number">108</span>
            </div>
          </div>
          <div className="contact-item" onClick={() => window.open('tel:104')}>
            <div className="contact-icon">🏥</div>
            <div className="contact-info">
              <span className="contact-name">Health Helpline</span>
              <span className="contact-number">104</span>
            </div>
          </div>
          <div className="contact-item" onClick={() => window.open('tel:1912')}>
            <div className="contact-icon">💧</div>
            <div className="contact-info">
              <span className="contact-name">Water Quality Helpline</span>
              <span className="contact-number">1912</span>
            </div>
          </div>
          <div className="contact-item" onClick={() => window.open('tel:112')}>
            <div className="contact-icon">🆘</div>
            <div className="contact-info">
              <span className="contact-name">Emergency</span>
              <span className="contact-number">112</span>
            </div>
          </div>
        </div>
      </div>

      {/* Health Alerts */}
      <div className="health-alerts">
        <div className="alert-card info">
          <div className="alert-icon">ℹ️</div>
          <div className="alert-content">
            <h4>Water Quality Advisory</h4>
            <p>Regular water testing recommended in your area. Use filtered water for drinking.</p>
          </div>
        </div>
      </div>
    </div>
  );
      case 'reports':
  return (
    <div id="reports" className="content-section active">
      {/* Header with Stats */}
      <div className="reports-header">
        <div className="header-title">
          <h2>
            <span className="header-icon"></span>
            {t('navReports')}
          </h2>
          <p className="section-description">Submit and track water quality complaints in your village</p>
        </div>
        
        {/* Stats Cards */}
        <div className="reports-stats">
          <div className="stat-card">
            <span className="stat-value">{complaints.length}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card">
            <span className="stat-value pending">{complaints.filter(c => c.status === 'pending').length}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card">
            <span className="stat-value progress">{complaints.filter(c => c.status === 'in-progress').length}</span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat-card">
            <span className="stat-value resolved">{complaints.filter(c => c.status === 'resolved').length}</span>
            <span className="stat-label">Resolved</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="reports-action-bar">
        <button 
          className={`btn-action ${!showReportForm ? 'active' : ''}`}
          onClick={() => setShowReportForm(false)}
        >
          <span className="btn-icon">📋</span>
          View Complaints
        </button>
        <button 
          className={`btn-action ${showReportForm ? 'active' : ''}`}
          onClick={() => setShowReportForm(true)}
        >
          <span className="btn-icon">➕</span>
          New Complaint
        </button>
      </div>

      {/* Submit Form */}
      {showReportForm && (
        <div className="form-container">
          <div className="form-header">
            <h3>
              <span className="form-icon">📝</span>
              Submit New Complaint
            </h3>
            <p>Please provide details about the water quality issue</p>
          </div>
          
          <form className="report-form enhanced" onSubmit={handleReportSubmit}>
            <div className="form-group">
              <label htmlFor="title">
                <span className="label-icon">📌</span>
                Complaint Title
              </label>
              <input 
                type="text" 
                name="title" 
                id="title"
                placeholder="e.g., Contaminated well water" 
                required 
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="location">
                  <span className="label-icon">📍</span>
                  Location
                </label>
                <input 
                  type="text" 
                  name="location" 
                  id="location"
                  placeholder="e.g., Village A, Near Temple" 
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">
                  <span className="label-icon">🏷️</span>
                  Category
                </label>
                <select name="category" id="category" defaultValue="">
                  <option value="" disabled>Select category</option>
                  <option value="water-quality">Water Quality</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="supply">Water Supply</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">
                <span className="label-icon">📄</span>
                Description
              </label>
              <textarea 
                name="description" 
                id="description"
                placeholder="Please describe the issue in detail..." 
                rows={4} 
                required
              ></textarea>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowReportForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-submit">
                <span className="btn-icon">📤</span>
                {t('submitReport')}
              </button>
            </div>
          </form>

          {/* Tips */}
          <div className="form-tips">
            <span className="tips-icon">💡</span>
            <span className="tips-text">Include specific details like time, location, and photos if possible</span>
          </div>
        </div>
      )}

      {/* Complaints List */}
      {!showReportForm && (
        <div className="complaints-container">
          <div className="complaints-header">
            <h3>
              <span className="header-icon">📋</span>
              Recent Complaints
            </h3>
            
            {/* Filter/Search */}
            <div className="complaints-filter">
              <select className="filter-select" defaultValue="all">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <input 
                type="text" 
                placeholder="🔍 Search complaints..." 
                className="filter-search"
              />
            </div>
          </div>

          {complaints.length > 0 ? (
            <div className="complaints-grid">
              {complaints.map(complaint => (
                <div key={complaint.id} className={`complaint-card enhanced status-${complaint.status}`}>
                  {/* Status Badge */}
                  <div className="complaint-status">
                    <span className={`status-badge ${complaint.status}`}>
                      {complaint.status === 'pending' && '⏳'}
                      {complaint.status === 'in-progress' && '🔄'}
                      {complaint.status === 'resolved' && '✅'}
                      {complaint.status === 'pending' && t('statusPending')}
                      {complaint.status === 'in-progress' && t('statusInProgress')}
                      {complaint.status === 'resolved' && t('statusResolved')}
                    </span>
                  </div>

                  {/* Complaint Content */}
                  <div className="complaint-content">
                    <h4>{complaint.title}</h4>
                    
                    <div className="complaint-meta">
                      <span className="meta-item">
                        <span className="meta-icon">📍</span>
                        {complaint.location}
                      </span>
                      <span className="meta-item">
                        <span className="meta-icon">📅</span>
                        {complaint.date}
                      </span>
                      {complaint.category && (
                        <span className="meta-item">
                          <span className="meta-icon">🏷️</span>
                          {complaint.category}
                        </span>
                      )}
                    </div>

                    <p className="complaint-description">{complaint.description}</p>

                    {/* Progress Bar for In-Progress */}
                    {complaint.status === 'in-progress' && (
                      <div className="progress-indicator">
                        <div className="progress-bar" style={{width: '60%'}}></div>
                        <span className="progress-text">60% Complete</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="complaint-footer">
                    <div className="action-buttons">
                      {complaint.status !== 'resolved' && (
                        <>
                          <button 
                            className="btn-icon-only success" 
                            onClick={() => updateComplaintStatus(complaint.id, 'resolved')}
                            title="Mark as Resolved"
                          >
                            ✅
                          </button>
                          <button 
                            className="btn-icon-only warning" 
                            onClick={() => updateComplaintStatus(complaint.id, 'in-progress')}
                            title="Mark In Progress"
                          >
                            🔄
                          </button>
                        </>
                      )}
                      <button 
                        className="btn-icon-only danger" 
                        onClick={() => deleteComplaint(complaint.id)}
                        title="Delete Complaint"
                      >
                        🗑️
                      </button>
                      <button 
                        className="btn-icon-only info" 
                        onClick={() => viewComplaintDetails(complaint)}
                        title="View Details"
                      >
                        👁️
                      </button>
                    </div>
                    
                    <span className="complaint-id">ID: #{complaint.id}</span>
                  </div>

                  {/* Time Indicator */}
                  <div className="time-indicator">
                    <span className="time-dot"></span>
                    <span className="time-text">Submitted just now</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No Complaints Found</h3>
              <p>There are no complaints in the system yet. Click "New Complaint" to submit one.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
      case 'settings':
        return (
          <div id="settings" className="content-section active">
            <h2>⚙️ {t('settingsTitle')}</h2>
            <p>{t('settingsDesc')}</p>

            <div className="settings-card">
              <h3>Language</h3>
             <select 
  value={currentLanguage} 
  onChange={(e) => changeLanguage(e.target.value)}
  className="settings-select"
>
  <option value="en">🇺🇸 English</option>
  <option value="hi">🇮🇳 हिंदी</option>
  <option value="ta">🇮🇳 தமிழ்</option>
  <option value="te">🇮🇳 తెలుగు</option>
  <option value="ml">🇮🇳 മലയാളം</option>
</select>
            </div>

            <div className="settings-card">
              <h3>Theme</h3>
              <button className="btn btn-secondary" onClick={toggleTheme}>
                {currentTheme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </button>
            </div>

            <div className="settings-card">
              <h3>Notifications</h3>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={voiceAlertsEnabled}
                  onChange={(e) => toggleVoiceAlerts(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span>Enable Voice Alerts</span>
            </div>

            <div className="settings-card">
              <h3>Data Refresh</h3>
              <button className="btn btn-primary" onClick={refreshWaterQualityData}>
                Refresh Now
              </button>
              <p>Last updated: {waterQualityData.lastUpdated}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className={`app ${currentTheme} ${emergencyAlertActive ? 'has-emergency-banner' : ''}`}>
      {/* Emergency Banner */}
      {emergencyAlertActive && (
        <div className="emergency-banner">
          <span>🚨 {t('emergencyAlert')}</span>
          <button className="close-btn" onClick={closeEmergencyBanner}>✕</button>
        </div>
      )}

   
     


      <div className="layout">
        <aside className="sidebar">
          
          <div className="sidebar-brand">
            
  <div className="logo-container">
    <img 
        src="/wave-genix-logo.jpeg"
      alt="WaveGenix Logo" 
      className="logo-image"
    />
    <h1>{t('appName')}</h1>
  </div>
  <p>{t('welcome')}</p>
</div>

          <div className="sidebar-menu">
            <button
              className={activeSection === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveSection('dashboard')}
            >
              {t('navDashboard')}
            </button>
            <button
              className={activeSection === 'mapSection' ? 'active' : ''}
              onClick={() => setActiveSection('mapSection')}
            >
              {t('navMap')}
            </button>
            <button
              className={activeSection === 'analytics' ? 'active' : ''}
              onClick={() => setActiveSection('analytics')}
            >
              {t('navAnalytics')}
            </button>
            <button
              className={activeSection === 'alerts' ? 'active' : ''}
              onClick={() => setActiveSection('alerts')}
            >
              {t('navAlerts')}
            </button>
            <button
              className={activeSection === 'qrGenerator' ? 'active' : ''}
              onClick={() => setActiveSection('qrGenerator')}
            >
              {t('navQRGenerator')}
            </button>
            <button
              className={activeSection === 'game' ? 'active' : ''}
              onClick={() => setActiveSection('game')}
            >
              {t('navGame')}
            </button>
            <button
              className={activeSection === 'villageHeads' ? 'active' : ''}
              onClick={() => setActiveSection('villageHeads')}
            >
              {t('navVillageHeads')}
            </button>
            <button
              className={activeSection === 'education' ? 'active' : ''}
              onClick={() => setActiveSection('education')}
            >
              {t('navEducation')}
            </button>
            <button
              className={activeSection === 'health' ? 'active' : ''}
              onClick={() => setActiveSection('health')}
            >
              {t('navHealth')}
            </button>
            <button
              className={activeSection === 'reports' ? 'active' : ''}
              onClick={() => setActiveSection('reports')}
            >
              {t('navReports')}
            </button>
            <button
              className={activeSection === 'settings' ? 'active' : ''}
              onClick={() => setActiveSection('settings')}
            >
              {t('navSettings')}
            </button>
          </div>
          <div className="sidebar-footer">
  <select
    value={currentLanguage}
    onChange={(e) => changeLanguage(e.target.value)}
    className="language-select"
  >
    <option value="en">English</option>
    <option value="hi">हिंदी</option>
    <option value="ta">தமிழ்</option>
    <option value="te">తెలుగు</option>
    <option value="ml">മലയാളം</option>
  </select>
  <button className="theme-toggle" onClick={toggleTheme}>
    {currentTheme === 'light' ? '🌙' : '☀️'}
  </button>
</div>
</aside>

<div className="content-area">
<header className="topbar">
    {/* SINGLE topbar-right div - FIXED */}
    <div className="topbar-right">
      <div className="language-indicator">
        {currentLanguage === 'en' && '🇺🇸'}
        {currentLanguage === 'hi' && '🇮🇳'}
        {currentLanguage === 'ta' && '🇮🇳'}
        {currentLanguage === 'te' && '🇮🇳'}
        {currentLanguage === 'ml' && '🇮🇳'}
      </div>
      <button className="icon-btn">🔔</button>
      <button className="icon-btn" onClick={toggleTheme}>
        {currentTheme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  </header>

  <main className="main-content">
    {renderSection()}
  </main>
</div>
</div>
</div>
);
};

export default WaveGenixDashboard;









