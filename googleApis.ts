export interface GoogleApiDefinition {
    title: string;
    description: string;
    category: 'CLOUD' | 'WORKSPACE' | 'ADS' | 'DATA' | 'CORE' | 'AI';
}

export const GOOGLE_APIS: GoogleApiDefinition[] = [
    { title: "Abusive Experience Report API", description: "Views Abusive Experience Report data.", category: "CORE" },
    { title: "Accelerated Mobile Pages (AMP) URL API", description: "Retrieves the list of AMP URLs.", category: "CORE" },
    { title: "Advisory Notifications API", description: "An API for accessing Advisory Notifications in Google Cloud", category: "CLOUD" },
    { title: "AI Platform Training & Prediction API", description: "An API to enable creating and using machine learning models.", category: "AI" },
    { title: "AlloyDB API", description: "High-performance PostgreSQL-compatible database service.", category: "DATA" },
    { title: "Google Analytics Data API", description: "Accesses report data in Google Analytics.", category: "DATA" },
    { title: "Apigee API", description: "Develop, deploy, secure, and manage APIs.", category: "CLOUD" },
    { title: "Artifact Registry API", description: "Store and manage build artifacts.", category: "CLOUD" },
    { title: "BigQuery API", description: "Data platform for creating, managing, sharing and querying data.", category: "DATA" },
    { title: "Blockchain Node Engine API", description: "Managed blockchain infrastructure.", category: "CLOUD" },
    { title: "Cloud Asset API", description: "Manages the history and inventory of Google Cloud resources.", category: "CLOUD" },
    { title: "Cloud Billing API", description: "Manage billing for Google Cloud projects.", category: "CLOUD" },
    { title: "Cloud Build API", description: "Creates and manages builds on Google Cloud.", category: "CLOUD" },
    { title: "Cloud DNS API", description: "Reliable, resilient, low-latency DNS serving.", category: "CLOUD" },
    { title: "Cloud Document AI API", description: "Parse structured info from unstructured documents.", category: "AI" },
    { title: "Cloud Functions API", description: "Manages lightweight user-provided functions.", category: "CLOUD" },
    { title: "Cloud Healthcare API", description: "Manage and access healthcare data.", category: "DATA" },
    { title: "Cloud Monitoring API", description: "Manages Cloud Monitoring data and configurations.", category: "CLOUD" },
    { title: "Cloud Natural Language API", description: "Sentiment analysis, entity recognition, and text annotations.", category: "AI" },
    { title: "Cloud OS Login API", description: "Manage access to VM instances using IAM roles.", category: "CLOUD" },
    { title: "Cloud Pub/Sub API", description: "Reliable, many-to-many, asynchronous messaging.", category: "CLOUD" },
    { title: "Cloud Run Admin API", description: "Deploy and manage scalable containerized apps.", category: "CLOUD" },
    { title: "Cloud Spanner API", description: "Managed, mission-critical relational database.", category: "DATA" },
    { title: "Cloud Vision API", description: "Image labeling, face, logo, and landmark detection.", category: "AI" },
    { title: "Compute Engine API", description: "Creates and runs virtual machines on Google Cloud.", category: "CLOUD" },
    { title: "Contact Center AI Insights API", description: "Detect and visualize patterns in contact center data.", category: "AI" },
    { title: "Dialogflow API", description: "Builds conversational interfaces and chatbots.", category: "AI" },
    { title: "Discovery Engine API", description: "Search and recommendation engine service.", category: "AI" },
    { title: "Google Calendar API", description: "Manage calendars and events.", category: "WORKSPACE" },
    { title: "Google Chat API", description: "Build Chat apps and manage Chat resources.", category: "WORKSPACE" },
    { title: "Google Classroom API", description: "Manages classes, rosters, and invitations.", category: "WORKSPACE" },
    { title: "Google Docs API", description: "Reads and writes Google Docs documents.", category: "WORKSPACE" },
    { title: "Google Sheets API", description: "Reads and writes Google Sheets.", category: "WORKSPACE" },
    { title: "Google Vault API", description: "Retention and eDiscovery for Workspace.", category: "WORKSPACE" },
    { title: "Secret Manager API", description: "Stores sensitive data like API keys and passwords.", category: "CORE" },
    { title: "Vertex AI API", description: "Train and deploy custom machine learning models.", category: "AI" },
    { title: "YouTube Data API", description: "Access YouTube data: videos, playlists, channels.", category: "CORE" },
    { title: "Workflow Executions API", description: "Execute workflows created with Workflows API.", category: "CORE" }
];
