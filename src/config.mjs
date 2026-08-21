export const appConfigs = {
  core: {
    name: "FieldWise Core",
    eyebrow: "Education workspace",
    welcome: "Plan fieldwork, manage classes and bring evidence together.",
    accent: "#26715d",
    accentDark: "#174c40",
    tabs: [
      ["home", "Home", "⌂"], ["classes", "Classes", "♙"],
      ["activities", "Activities", "▦"], ["fieldwork", "Fieldwork", "⌖"],
      ["more", "More", "•••"]
    ],
    cards: [
      ["Plan fieldwork", "Build aims, methods, equipment and risk controls.", "fieldwork"],
      ["Classroom", "Create classes, join with a code and review submissions.", "classes"],
      ["Activities", "Launch curriculum activities across FieldWise subjects.", "activities"],
      ["Field sheets", "Capture observations, photographs and survey responses.", "fieldwork"],
      ["Reports", "Turn evidence into structured, export-ready reports.", "more"],
      ["Subject apps", "Continue work in Biology or History.", "activities"]
    ]
  },
  biology: {
    name: "FieldWise Biology",
    eyebrow: "Biological investigation",
    welcome: "Investigate living systems from field sampling to evidence portfolio.",
    accent: "#28704b",
    accentDark: "#17462e",
    tabs: [
      ["activity", "Today", "▦"], ["tools", "Investigations", "⌁"],
      ["map", "Tools", "⌖"], ["data", "Evidence", "▥"], ["evidence", "Portfolio", "▣"]
    ],
    cards: [
      ["Today", "Continue assigned and recent biology work.", "activity"],
      ["Investigations", "Run ecology, microscopy, genetics, physiology and plant trials.", "tools"],
      ["Biology tools", "Use sampling, taxonomy, microscopy and measurement workspaces.", "map"],
      ["Evidence", "Review observations, measurements and captured media.", "data"],
      ["Analysis", "Compare results and evaluate biological claims.", "data"],
      ["Evidence portfolio", "Review completeness and prepare a Core submission.", "evidence"]
    ]
  },
  history: {
    name: "FieldWise History",
    eyebrow: "Historical investigation",
    welcome: "Investigate the past from field notebook to evidence-based argument.",
    accent: "#c6533e",
    accentDark: "#823426",
    tabs: [
      ["activity", "Activity", "▦"], ["tools", "History Tools", "⌁"],
      ["places", "Places", "⌖"], ["sources", "Sources & Data", "▤"],
      ["evidence", "Evidence", "▣"]
    ],
    cards: [
      ["Investigation notebook", "Record observations, questions and reflections.", "tools"],
      ["Historical inquiry", "Develop questions, hypotheses and investigation plans.", "tools"],
      ["Places & excursions", "Map significant sites and organise field activities.", "places"],
      ["Source laboratory", "Evaluate context, purpose, perspective and reliability.", "sources"],
      ["Timeline", "Connect events, evidence and change over time.", "tools"],
      ["Evidence & argument", "Build sourced claims and prepare a Core submission.", "evidence"]
    ]
  }
};

export function resolveAppConfig(value) {
  return appConfigs[value] || appConfigs.core;
}
