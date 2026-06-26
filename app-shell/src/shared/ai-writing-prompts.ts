import type { AiPromptTemplate } from './ai'

export type DocumentsAiPromptAction =
  | 'rewrite-selection'
  | 'continue-from-cursor'
  | 'summarize-active-document'

interface DocumentsAiPromptDefinition {
  action: DocumentsAiPromptAction
  name: string
  description: string
  body: string
}

const DOCUMENTS_AI_OUTPUT_CONTRACTS: Record<DocumentsAiPromptAction, string[]> = {
  'rewrite-selection': [
    'Output contract:',
    '- Output only the revised replacement passage.',
    '- Preserve paragraph breaks from the replacement passage where useful.',
    '- Do not include labels, markdown fences, commentary, explanation, or the quoted source text.'
  ],
  'continue-from-cursor': [
    'Output contract:',
    '- Output only continuation prose that can be appended after the cursor.',
    '- Do not include labels, markdown fences, commentary, or explanation.'
  ],
  'summarize-active-document': [
    'Output contract:',
    '- Output only a concise working summary note for the writer.',
    '- Do not include labels, markdown fences, commentary, or explanation.'
  ]
}

export const DOCUMENTS_AI_PROMPT_DEFINITIONS: DocumentsAiPromptDefinition[] = [
  {
    action: 'rewrite-selection',
    name: 'Documents: Rewrite Selection',
    description: 'Rewrite selected text while preserving the document voice.',
    body: [
      'Rewrite the selected passage while preserving the document voice.',
      '',
      'Instruction: {{user_input}}',
      '',
      'Selected text:',
      '{{selected_text}}',
      '',
      'Before the selection:',
      '{{before}}',
      '',
      'After the selection:',
      '{{after}}',
      '',
      'Selected context documents:',
      '{{selected_documents}}'
    ].join('\n')
  },
  {
    action: 'continue-from-cursor',
    name: 'Documents: Continue From Cursor',
    description: 'Continue the active document from the cursor.',
    body: [
      'Continue the active document from the cursor in the same voice and continuity.',
      '',
      'Instruction: {{user_input}}',
      '',
      'Text before the cursor:',
      '{{before}}',
      '',
      'Text after the cursor:',
      '{{after}}',
      '',
      'Selected context documents:',
      '{{selected_documents}}'
    ].join('\n')
  },
  {
    action: 'summarize-active-document',
    name: 'Documents: Summarize Active Document',
    description: 'Summarize the active document for a working writer.',
    body: [
      'Summarize the active document for a working writer.',
      '',
      'Title: {{active_document_title}}',
      'Kind: {{document_kind}}',
      'Workspace: {{workspace_name}}',
      '',
      'Document and selected context:',
      '{{selected_documents}}'
    ].join('\n')
  }
]

export function documentsAiPromptTemplateId(
  workspaceId: string,
  action: DocumentsAiPromptAction
): string {
  return `builtin.documents.${action}.${workspaceId}`
}

export function documentsAiPromptDefinition(
  action: DocumentsAiPromptAction
): DocumentsAiPromptDefinition {
  const definition = DOCUMENTS_AI_PROMPT_DEFINITIONS.find(item => item.action === action)
  if (!definition) throw new Error(`Unknown Documents AI prompt action: ${action}`)
  return definition
}

export function documentsAiPromptWithOutputContract(
  action: DocumentsAiPromptAction,
  body: string
): string {
  return [
    body.trim(),
    DOCUMENTS_AI_OUTPUT_CONTRACTS[action].join('\n')
  ].filter(Boolean).join('\n\n')
}

export function createDocumentsAiPromptTemplate(params: {
  workspaceId: string
  action: DocumentsAiPromptAction
  now: string
  defaultModel: string
}): AiPromptTemplate {
  const definition = documentsAiPromptDefinition(params.action)
  return {
    id: documentsAiPromptTemplateId(params.workspaceId, params.action),
    workspaceId: params.workspaceId,
    name: definition.name,
    description: definition.description,
    body: definition.body,
    variables: Array.from(definition.body.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)).map(match => match[1]),
    defaultModel: params.defaultModel,
    defaultTemperature: 0.7,
    contextPolicy: {
      includeSelectedContext: true,
      documentsAction: params.action
    },
    tags: ['built-in', 'documents', 'writing'],
    isProtected: true,
    createdAt: params.now,
    updatedAt: params.now,
    archivedAt: null
  }
}

interface MopPromptDefinition {
  id: string
  name: string
  description: string
  body: string
}

export const MOP_PROMPT_DEFINITIONS: MopPromptDefinition[] = [
  {
    id: 'mop-a-manuscript-overhaul-plan',
    name: 'MOP A: Manuscript Overhaul Plan',
    description: 'Review the manuscript and selected context to produce a detailed manuscript overhaul plan.',
    body: [
      '{{selected_documents}}',
      '',
      '{{before}}',
      '',
      'Read this novel and using what you know about the genre, produce a Manuscript Overhaul Plan with specific details about any areas in this manuscript that need addressing. Your goal is to provide specific, meaningful feedback that will help elevate this to the level of an acquisitions editor at a top publishing company.',
      '',
      'Targeted Focus for Overhaul:',
      '',
      '- Assess the pacing and progression of suspense/tension.',
      "- Evaluate each main character's motivations and arcs for consistency.",
      '- Identify sections of the story that could benefit from heightened tension, streamlined exposition, or deeper emotional resonance.',
      '- Examine the thematic elements and suggest any expansions or clarifications to strengthen them.',
      '- Suggest improvements that align with commercial viability, focusing on what an acquisitions editor might look for in a novel of the genre.',
      '',
      'Overall Narrative & Character Development:',
      '',
      '- Comment on the overall story arc, including the climax and resolution.',
      '- Check if the main plot remains compelling from start to finish.',
      '- Indicate any subplot or character whose arc feels underdeveloped or too loosely tied to the main narrative.',
      '',
      'Specialized Language & Jargon Assessment:',
      '',
      "- Identify any overuse of specialized terminology related to the protagonist's expertise, background, or the story's central metaphors (e.g., music, science, technology).",
      '- Evaluate whether specialized language enhances characterization and worldbuilding or creates barriers to reader engagement.',
      '- Suggest specific strategies to balance authentic voice with accessibility, such as:',
      '    - Establishing clear context for specialized terms early in the narrative',
      '    - Varying metaphorical language beyond the primary domain',
      '    - Reserving technical terminology for key plot moments rather than routine descriptions',
      '    - Ensuring emotional moments are conveyed in universally accessible language',
      '    - Creating a balance between specialized terminology and sensory descriptions',
      '- Provide examples of passages where jargon could be simplified without losing the distinctive voice',
      '',
      'Usage of Provided Materials:',
      '',
      '- Cross-reference your feedback with the tropes, themes, and character profiles provided.',
      '- Note whether each character is utilized to their fullest potential based on their documented personalities and arcs.',
      '- Align suggestions with the stated Writing Style.',
      '',
      'Constructive Solutions:',
      '',
      '- For any perceived issues, guide me with explicit solutions: possible rewritten lines, alternative plot beats, or additional scenes.',
      "- If no major issue exists in a certain section, indicate that it's working well.",
      '',
      'Final Deliverable: A structured, in-depth Manuscript Overhaul Plan with:',
      '',
      '- Overall Observations',
      '- Character Arc Evaluations',
      '- Themes & Market Fit Suggestions',
      '- Specialized Language Analysis & Recommendations',
      '- Additional Recommendations (high, medium, low priority)',
      '- Closing Remarks',
      '',
      "Reminder: Ensure all content is relevant and directly aimed at elevating the manuscript to a professional publishing standard. Omit feedback that isn't actionable or pertinent."
    ].join('\n')
  },
  {
    id: 'mop-b-chapter-editing-plan',
    name: 'MOP B: Chapter Editing Plan',
    description: 'Turn the manuscript overhaul plan into a concrete editing plan for the active chapter.',
    body: [
      '{{selected_documents}}',
      '',
      '{{before}}',
      '',
      'Using the [MANUSCRIPT OVERHAUL PLAN] as your guiding document, please produce a detailed Editing Plan for the current chapter. Keep the following points in mind:',
      '',
      "Refer back to the Overhaul Plan's global recommendations (pacing, character consistency, thematic depth) and show how each proposed edit in this chapter addresses or supports those high-level objectives.",
      '',
      'Provide a brief scene-by-scene breakdown of what needs revision. Focus particularly on:',
      '',
      '- Strengthening the in medias res opening hook.',
      "- Ensuring the chapter's ending flows naturally into the next while offering a compelling cliffhanger or resolution.",
      "- Maintaining consistency with each character's established personality and arc.",
      '- Preserving and enhancing the overall plot without adding new, unrelated subplots or characters.',
      '',
      'Specialized Language & Jargon Assessment:',
      '',
      "- Identify any passages where specialized terminology or jargon (particularly related to the protagonist's profession or the story's central metaphors) might create barriers for readers.",
      '- Suggest specific revisions to balance authentic voice with accessibility by:',
      '    - Replacing overly technical terms with more accessible language where appropriate',
      '    - Adding clarifying context for necessary specialized terminology',
      "    - Ensuring critical plot points aren't dependent solely on understanding specialized concepts",
      '    - Varying metaphorical language beyond a single domain (e.g., music, science, technology)',
      '    - Pairing specialized descriptions with universal sensory or emotional cues',
      '- For each suggested revision, provide a concrete example of how the text could be modified',
      '',
      'If you see any areas where the chapter lags in pacing or where the dialogue/inner monologue could be more impactful, suggest specific rewrites or modifications. Please include concrete examples or sample text.',
      '',
      'For each suggested edit or removal, briefly explain why it is necessary (e.g., "removing this line tightens the tension," "adding a small internal reaction clarifies the protagonist\'s emotional state," or "simplifying this technical description makes the action sequence more accessible").',
      '',
      'Ensure that the suggested changes enhance the storyline, genre expectations and emotional stakes set out in the Overhaul Plan. If any new thematic threads can be reinforced here in alignment with the main storyline, mention them.',
      '',
      'End with a summarized list of recommended edits ranked by priority-High (crucial for plot coherence), Medium (important for enhancing reader experience), or Low (optional refinements). Include a specific section for jargon/specialized language revisions in this prioritized list.',
      '',
      "Remember that each chapter must open with purposeful action or dialogue that directly follows from the previous chapter's end, and close with a compelling beat that pushes the reader onward.",
      '',
      "It's okay if you don't need to do much editing. Just be specific on anything that needs addressing. Don't deviate from the plot or add any unnecessary extra information."
    ].join('\n')
  },
  {
    id: 'mop-c-revise-chapter',
    name: 'MOP C: Revise Chapter',
    description: 'Revise the active chapter according to the chapter editing plan while preserving voice and scope.',
    body: [
      '{{selected_documents}}',
      '',
      '{{before}}',
      '',
      'Revise the current chapter according to the [CHAPTER EDITING PLAN]. Only change what is needed to suit the plan. Do not add items not mentioned in the chapter. Remove excessive metaphors and similes that make the prose sound robotic. Maintain the same tone and style per the Writing Style Guidelines. Use only nonstandard dialogue tags and avoid cliche endings.',
      '',
      'Remember that each scene/chapter must begin with an opening hook in media res, with an action or line of dialogue, immediately drawing the reader into the scene, following smoothly from the previous chapter. In addition, every scene/chapter must end with a compelling cliffhanger or resolution that flows naturally and logically into the next scene/chapter, pushing the reader to want to continue reading.',
      '',
      'In the revision, remove em-dashes as much as possible.',
      '',
      'Target Word Count: 3,000 - 3,500 words.',
      '',
      'Please start your chapter with the tag [BEGIN CHAPTER X] and end with [END CHAPTER X]. Use this exact configuration and numbering that matches the appropriate current chapter number. Never address me, just provide the content as requested.'
    ].join('\n')
  }
]

function mopPromptTemplateId(workspaceId: string, definitionId: string): string {
  return `mop.${definitionId}.${workspaceId}`
}

export function createMopPromptTemplate(params: {
  workspaceId: string
  definition: MopPromptDefinition
  now: string
  defaultModel: string
}): AiPromptTemplate {
  return {
    id: mopPromptTemplateId(params.workspaceId, params.definition.id),
    workspaceId: params.workspaceId,
    name: params.definition.name,
    description: params.definition.description,
    body: params.definition.body,
    variables: Array.from(params.definition.body.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)).map(match => match[1]),
    defaultModel: params.defaultModel,
    defaultTemperature: 0.7,
    contextPolicy: { includeSelectedContext: true, workflow: 'mop' },
    tags: ['mop', 'manuscript', 'workflow'],
    isProtected: false,
    createdAt: params.now,
    updatedAt: params.now,
    archivedAt: null
  }
}
