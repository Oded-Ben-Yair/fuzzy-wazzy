// Service/expertise normalization utilities for CSV ingestion

const SERVICE_SYNONYMS = {
  "wound care": ["wound", "wound_treatment", "wound_care", "WOUND_CARE"],
  "medication": ["medication", "meds", "MEDICATION", "MEDICATION_ARRANGEMENT"],
  "hospital": ["hospital", "_hospital", "PRIVATE_SECURITY_HOSPITAL"],
  "home care": ["_home", "home", "PRIVATE_SECURITY_HOME"],
  "pediatrics": ["pediatrics", "child", "kids", "PEDIATRICS"],
  "day night": ["day_night", "DAY_NIGHT", "DAY_NIGHT_CIRCUMCISION_NURSE"],
  "circumcision": ["circumcision", "CIRCUMCISION_NURSE"],
  "general": ["default", "general", "nurse", "DEFAULT"],
  "catheter": ["catheter", "CENTRAL_CATHETER_TREATMENT"],
  "stoma": ["stoma", "STOMA_TREATMENT"],
  "enema": ["enema", "ENEMA_UNDER_INSTRUCTION"]
};

const MOBILITY_TO_EXPERTISE = {
  "INDEPENDENT": "independent",
  "WALKER": "mobility-walker",
  "WHEELCHAIR": "mobility-wheelchair",
  "BEDRIDDEN": "mobility-bedridden",
  "WALKING_CANE": "mobility-cane"
};

export function normalizeToken(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .trim();
}

export function extractServices(treatmentType, name, remarks) {
  const services = new Set();
  
  // Process treatment type
  const normalizedTreatment = normalizeToken(treatmentType);
  
  // Check against synonym map
  for (const [canonical, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
    for (const syn of synonyms) {
      const synNorm = normalizeToken(syn);
      if (treatmentType === syn || normalizedTreatment.includes(synNorm)) {
        services.add(canonical);
      }
    }
  }
  
  // Process name field if it looks like a service
  const normalizedName = normalizeToken(name);
  for (const [canonical, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
    for (const syn of synonyms) {
      const synNorm = normalizeToken(syn);
      if (name === syn || normalizedName.includes(synNorm)) {
        services.add(canonical);
      }
    }
  }
  
  // Process remarks if available
  if (remarks) {
    const normalizedRemarks = normalizeToken(remarks);
    for (const [canonical, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
      for (const syn of synonyms) {
        const synNorm = normalizeToken(syn);
        if (normalizedRemarks.includes(synNorm)) {
          services.add(canonical);
        }
      }
    }
  }
  
  // If no services found, add "general"
  if (services.size === 0) {
    services.add("general");
  }
  
  return Array.from(services);
}

export function extractExpertise(mobility, status, remarks) {
  const expertise = new Set();
  
  // Add mobility-based expertise
  if (mobility && MOBILITY_TO_EXPERTISE[mobility]) {
    expertise.add(MOBILITY_TO_EXPERTISE[mobility]);
  }
  
  // Add status-based tags
  if (status) {
    const statusNorm = normalizeToken(status);
    if (statusNorm.includes("cancelled") || statusNorm.includes("closed")) {
      expertise.add("experienced");
    }
    if (statusNorm.includes("active")) {
      expertise.add("active");
    }
  }
  
  // Extract from remarks
  if (remarks) {
    const remarksNorm = normalizeToken(remarks);
    if (remarksNorm.includes("urgent")) {
      expertise.add("urgent-care");
    }
    if (remarksNorm.includes("night")) {
      expertise.add("night-shift");
    }
    if (remarksNorm.includes("day")) {
      expertise.add("day-shift");
    }
  }
  
  return Array.from(expertise);
}