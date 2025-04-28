import type {
  Quiz,
  Question,
  WrittenResponseQuestion,
  ShortAnswerQuestion,
  MatchingQuestion,
  MatchingPair,
  MultipleChoiceQuestion,
  MCOption,
  TrueFalseQuestion,
  TFOption,
  MultiSelectQuestion,
  MSOption,
  OrderingQuestion,
  OrderingItem,
  BaseQuestion,
  QuestionType,
} from '@/types/quiz';

// Helper function to safely parse integers
const safeParseInt = (value: string | undefined, defaultValue: number = 0): number => {
  if (value === undefined || value === null || value.trim() === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Helper function to get a value or default
const getValue = <T>(arr: string[], index: number, defaultValue: T): string | T => {
    // Ensure index exists and value is not empty before returning
    return arr && arr[index] !== undefined && arr[index] !== null && arr[index] !== '' ? arr[index] : defaultValue;
}

// Basic CSV cell splitting function, handles simple quotes but not escaped quotes within quotes.
// A proper library (like Papaparse) is recommended for robust production use.
const splitCsvRow = (row: string): string[] => {
    const result: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"' && (i === 0 || row[i - 1] !== '\\')) { // Handle quote start/end (ignore escaped \)
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(currentCell.trim().replace(/^"|"$/g, '')); // Trim and remove surrounding quotes
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    result.push(currentCell.trim().replace(/^"|"$/g, '')); // Add the last cell
    return result;
};


export function parseQuizCsv(csvContent: string): Quiz {
  const rows = csvContent
    .split('\n')
    .map(row => row.trim())
    .filter(row => row.length > 0 && !/^\s*$/.test(row)); // Remove empty/whitespace-only lines

  const questions: Question[] = [];
  let currentQuestion: Partial<Question> | null = null;
  let currentLineNumber = 0;

  for (const rawRow of rows) {
    currentLineNumber++;
    const row = splitCsvRow(rawRow);
    const typeOrKey = getValue(row, 0, '').toLowerCase();
    const value = getValue(row, 1, '');
    const value2 = getValue(row, 2, '');
    const value3 = getValue(row, 3, '');
    const value4 = getValue(row, 4, '');
    const value5 = getValue(row, 5, '');


    if (typeOrKey === 'newquestion') {
      // Finalize the previous question before starting a new one
      if (currentQuestion) {
          // Validate and push the completed question
          if (currentQuestion.type && currentQuestion.title && currentQuestion.questionText && currentQuestion.points !== undefined) {
              // Further validation based on type could be added here if needed before pushing
              questions.push(currentQuestion as Question);
          } else {
              console.warn(`[Line ${currentLineNumber}] Skipping incomplete question started before this line. Missing type, title, text, or points. Title: ${currentQuestion.title || 'N/A'}`);
          }
      }
      // Start a new question object
      const questionTypeCode = value as QuestionType;
      // Basic validation for known types
      const knownTypes: QuestionType[] = ['WR', 'SA', 'M', 'MC', 'TF', 'MS', 'O'];
      if (!knownTypes.includes(questionTypeCode)) {
          console.warn(`[Line ${currentLineNumber}] Unknown question type '${questionTypeCode}'. Skipping this 'NewQuestion' entry.`);
          currentQuestion = null; // Reset currentQuestion as the type is invalid
          continue;
      }
      currentQuestion = { type: questionTypeCode, points: 1 }; // Default points to 1
      continue; // Move to the next row
    }

    if (!currentQuestion) {
      // Skip rows if we haven't encountered a valid 'NewQuestion' or if the previous one was invalid
      continue;
    }

    try { // Add try-catch around processing each row for better error isolation
        switch (typeOrKey) {
          case 'id':
            currentQuestion.id = value;
            break;
          case 'title':
            currentQuestion.title = value;
            break;
          case 'questiontext':
            currentQuestion.questionText = value;
            break;
          case 'points':
            currentQuestion.points = safeParseInt(value, 1);
            break;
          case 'difficulty':
            currentQuestion.difficulty = safeParseInt(value);
            break;
          case 'image':
            currentQuestion.image = value;
            break;
          case 'hint':
            currentQuestion.hint = value;
            break;
          case 'feedback':
             // Assign feedback. Logic attempts to assign to the most recently added element (option/item/etc.)
             // If no specific element context exists, assign as general question feedback.
            let feedbackAssigned = false;
            if (currentQuestion.type === 'MC' && (currentQuestion as Partial<MultipleChoiceQuestion>).options?.length > 0) {
                 const mc = currentQuestion as Partial<MultipleChoiceQuestion>;
                 if(mc.options) mc.options[mc.options.length - 1].feedback = value; feedbackAssigned = true;
            } else if (currentQuestion.type === 'MS' && (currentQuestion as Partial<MultiSelectQuestion>).options?.length > 0) {
                 const ms = currentQuestion as Partial<MultiSelectQuestion>;
                 if(ms.options) ms.options[ms.options.length - 1].feedback = value; feedbackAssigned = true;
            } else if (currentQuestion.type === 'TF') {
                // D2L TF feedback seems less specific. Assign to last defined option or general?
                // Let's try assigning to the last explicitly defined one (true/false row).
                const tf = currentQuestion as Partial<TrueFalseQuestion>;
                // Check which option was defined most recently (this assumes TF rows appear together)
                // This is heuristic. If true/false feedback rows are separate, might misassign.
                if(tf.falseOption && (!tf.trueOption || tf.falseOption.definedLine > tf.trueOption.definedLine) ){
                    tf.falseOption.feedback = value; feedbackAssigned = true;
                } else if (tf.trueOption) {
                    tf.trueOption.feedback = value; feedbackAssigned = true;
                }
            } else if (currentQuestion.type === 'O' && (currentQuestion as Partial<OrderingQuestion>).items?.length > 0) {
                 const oq = currentQuestion as Partial<OrderingQuestion>;
                 if(oq.items) oq.items[oq.items.length - 1].feedback = value; feedbackAssigned = true;
            }
            // If not assigned to a specific part above, or if WR/SA, assign as general feedback
            if (!feedbackAssigned) {
                currentQuestion.feedback = value;
            }
            break;

          // Written Response specific
          case 'initialtext':
            (currentQuestion as Partial<WrittenResponseQuestion>).initialText = value;
            break;
          case 'answerkey':
            (currentQuestion as Partial<WrittenResponseQuestion>).answerKey = value;
            break;

          // Short Answer specific
          case 'inputbox':
            (currentQuestion as Partial<ShortAnswerQuestion>).inputBox = {
              rows: safeParseInt(value, 1),
              cols: safeParseInt(value2, 40),
            };
            break;
          case 'answer': // For SA
            if (currentQuestion.type === 'SA') {
                const sa = currentQuestion as Partial<ShortAnswerQuestion>;
                sa.bestAnswer = value2; // The actual answer text
                const flag = value3.toLowerCase();
                sa.evaluation = flag === 'regexp' ? 'regexp' : (flag === 'sensitive' ? 'sensitive' : 'insensitive');
            } else {
                 console.warn(`[Line ${currentLineNumber}] 'Answer' row encountered for non-SA question type: ${currentQuestion.type}. Ignoring.`);
            }
            break;

          // Matching, MS, Ordering specific
           case 'scoring':
             if (currentQuestion.type === 'M') {
                 (currentQuestion as Partial<MatchingQuestion>).scoring = value as MatchingQuestion['scoring'];
             } else if (currentQuestion.type === 'MS') {
                 (currentQuestion as Partial<MultiSelectQuestion>).scoring = value as MultiSelectQuestion['scoring'];
             } else if (currentQuestion.type === 'O') {
                (currentQuestion as Partial<OrderingQuestion>).scoring = value as OrderingQuestion['scoring'];
             } else {
                 console.warn(`[Line ${currentLineNumber}] 'Scoring' row encountered for incompatible question type: ${currentQuestion.type}. Ignoring.`);
             }
            break;

          // Matching specific
          case 'choice': // For M
            if (currentQuestion.type === 'M') {
              const mq = currentQuestion as Partial<MatchingQuestion>;
              if (!mq.pairs) mq.pairs = [];
              const choiceNo = safeParseInt(value);
              if (choiceNo <= 0) {
                  console.warn(`[Line ${currentLineNumber}] Invalid Choice number '${value}' for Matching question '${mq.title}'. Skipping choice.`);
                  continue;
              }
              let pair = mq.pairs.find(p => p.choiceNo === choiceNo);
              if (pair) {
                  pair.choiceText = value2; // Update existing choice text
              } else {
                  mq.pairs.push({ choiceNo: choiceNo, choiceText: value2, matchText: '' }); // Add new pair with placeholder matchText
              }
            } else {
                 console.warn(`[Line ${currentLineNumber}] 'Choice' row encountered for non-Matching question type: ${currentQuestion.type}. Ignoring.`);
            }
            break;
           case 'match': // For M
             if (currentQuestion.type === 'M') {
               const mq = currentQuestion as Partial<MatchingQuestion>;
               if (!mq.pairs) mq.pairs = [];
               const choiceNo = safeParseInt(value);
               if (choiceNo <= 0) {
                   console.warn(`[Line ${currentLineNumber}] Invalid Match number '${value}' for Matching question '${mq.title}'. Skipping match.`);
                   continue;
               }
               let pair = mq.pairs.find(p => p.choiceNo === choiceNo);
               if (pair) {
                   pair.matchText = value2; // Update existing match text
               } else {
                    // Match appeared before choice - log warning and add placeholder
                   console.warn(`[Line ${currentLineNumber}] Matching question '${mq.title}' has Match row for non-existent Choice number ${choiceNo}. Creating placeholder choice.`);
                   mq.pairs.push({ choiceNo: choiceNo, choiceText: `[Choice ${choiceNo} Placeholder]`, matchText: value2 });
               }
             } else {
                  console.warn(`[Line ${currentLineNumber}] 'Match' row encountered for non-Matching question type: ${currentQuestion.type}. Ignoring.`);
             }
             break;


          // Multiple Choice / Multi-Select specific
          case 'option': // For MC, MS
            if (currentQuestion.type === 'MC') {
              const mcq = currentQuestion as Partial<MultipleChoiceQuestion>;
              if (!mcq.options) mcq.options = [];
              mcq.options.push({
                percent: safeParseInt(value),
                text: value2,
                htmlFlag: value3.toLowerCase() === 'html',
                feedback: value4 || undefined, // Feedback in 5th column
                feedbackHtmlFlag: value5.toLowerCase() === 'html', // HTML flag for feedback in 6th column
              });
            } else if (currentQuestion.type === 'MS') {
              const msq = currentQuestion as Partial<MultiSelectQuestion>;
              if (!msq.options) msq.options = [];
              msq.options.push({
                // D2L uses 'Correct'/'Incorrect' or weight. Standardize to weight.
                // Assume non-numeric value means incorrect (weight 0) unless specific logic needed.
                weight: safeParseInt(value, 0), // Weight/Correctness in 2nd column
                text: value2, // Text in 3rd column
                htmlFlag: value3.toLowerCase() === 'html', // HTML flag in 4th column
                feedback: value4 || undefined, // Feedback in 5th column
                feedbackHtmlFlag: value5.toLowerCase() === 'html', // HTML flag for feedback in 6th column
              });
            } else {
                 console.warn(`[Line ${currentLineNumber}] 'Option' row encountered for incompatible question type: ${currentQuestion.type}. Ignoring.`);
            }
            break;

          // True/False specific
          case 'true':
            if (currentQuestion.type === 'TF') {
              const tfq = (currentQuestion as Partial<TrueFalseQuestion>);
              tfq.trueOption = {
                isTrue: true,
                credit: safeParseInt(value), // Credit in 2nd column
                feedback: value2 || undefined, // Feedback in 3rd column
                htmlFlag: value3.toLowerCase() === 'html', // HTML flag in 4th column
                definedLine: currentLineNumber, // Track definition line for feedback assignment heuristic
              };
            } else {
                 console.warn(`[Line ${currentLineNumber}] 'True' row encountered for non-TF question type: ${currentQuestion.type}. Ignoring.`);
            }
            break;
          case 'false':
            if (currentQuestion.type === 'TF') {
              const tfq = (currentQuestion as Partial<TrueFalseQuestion>);
              tfq.falseOption = {
                isTrue: false,
                credit: safeParseInt(value), // Credit in 2nd column
                feedback: value2 || undefined, // Feedback in 3rd column
                htmlFlag: value3.toLowerCase() === 'html', // HTML flag in 4th column
                definedLine: currentLineNumber, // Track definition line for feedback assignment heuristic
              };
            } else {
                 console.warn(`[Line ${currentLineNumber}] 'False' row encountered for non-TF question type: ${currentQuestion.type}. Ignoring.`);
            }
            break;


          // Ordering specific
          case 'item': // For O
            if (currentQuestion.type === 'O') {
              const oq = currentQuestion as Partial<OrderingQuestion>;
              if (!oq.items) oq.items = [];
              oq.items.push({
                text: value, // Item text in 2nd column
                htmlFlag: value2.toLowerCase() === 'html', // HTML flag in 3rd column
                feedback: value3 || undefined, // Feedback in 4th column
                feedbackHtmlFlag: value5.toLowerCase() === 'html', // D2L uses col 6 (index 5) for item feedback HTML flag
              });
            } else {
                 console.warn(`[Line ${currentLineNumber}] 'Item' row encountered for non-Ordering question type: ${currentQuestion.type}. Ignoring.`);
            }
            break;

          default:
             if (typeOrKey && typeOrKey.trim() !== '') { // Log only if it's not just an empty row/separator
                 console.log(`[Line ${currentLineNumber}] Ignoring unrecognized row type or key: '${typeOrKey}'`);
             }
            break;
        }
    } catch (e) {
        console.error(`[Line ${currentLineNumber}] Error processing row: ${rawRow}. Error: ${e instanceof Error ? e.message : String(e)}`);
        // Optionally decide whether to skip the whole question or just this row's data
        // For now, we continue processing, but the question might be incomplete/invalid
    }
  }

  // Add the last processed question if it's valid
  if (currentQuestion) {
    let isValid = true;
    let skipReason = "";

    if (!(currentQuestion.type && currentQuestion.title && currentQuestion.questionText && currentQuestion.points !== undefined)) {
        isValid = false;
        skipReason = "Missing required fields (type, title, text, or points).";
    } else if (currentQuestion.type === 'M' && (!currentQuestion.pairs || currentQuestion.pairs.length === 0 || currentQuestion.pairs.some(p => !p.choiceText || !p.matchText))) {
        isValid = false; skipReason = "Matching question has no pairs, or some pairs are incomplete.";
    } else if (currentQuestion.type === 'MC' && (!currentQuestion.options || currentQuestion.options.length === 0)) {
        isValid = false; skipReason = "MultipleChoice question has no options.";
    } else if (currentQuestion.type === 'TF' && (!currentQuestion.trueOption || !currentQuestion.falseOption)) {
        isValid = false; skipReason = "TrueFalse question lacks true or false options definition.";
    } else if (currentQuestion.type === 'MS' && (!currentQuestion.options || currentQuestion.options.length === 0)) {
        isValid = false; skipReason = "MultiSelect question has no options.";
    } else if (currentQuestion.type === 'O' && (!currentQuestion.items || currentQuestion.items.length === 0)) {
        isValid = false; skipReason = "Ordering question has no items.";
    } else if (currentQuestion.type === 'SA' && currentQuestion.bestAnswer === undefined) { // Check for undefined specifically
        isValid = false; skipReason = "ShortAnswer question lacks a defined best answer.";
    }

    if (isValid) {
        questions.push(currentQuestion as Question);
    } else {
         console.warn(`Skipping last question (Title: ${currentQuestion.title || 'N/A'}) because it is incomplete or invalid. Reason: ${skipReason}`);
    }
  }


  return { questions };
}
