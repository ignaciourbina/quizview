
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
const splitCsvRow = (row: string): string[] => {
    const result: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"') {
             // Handle CSV standard for escaped quotes ("")
            if (inQuotes && i + 1 < row.length && row[i+1] === '"') {
                currentCell += '"'; // Add one quote to the cell
                i++; // Skip the next quote
                continue;
            }
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(currentCell.trim()); // Push currentCell as is, will remove outer quotes later if necessary
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    result.push(currentCell.trim()); // Add the last cell

    // Remove surrounding quotes from each cell if they exist
    return result.map(cell => {
        if (cell.startsWith('"') && cell.endsWith('"')) {
            return cell.substring(1, cell.length - 1).replace(/""/g, '"'); // Replace escaped "" with "
        }
        return cell;
    });
};

// Robust CSV record splitter that handles quoted newlines
function splitCsvToRecords(csvString: string): string[] {
    const records: string[] = [];
    let currentRecordStart = 0;
    let inQuotes = false;

    for (let i = 0; i < csvString.length; i++) {
        const char = csvString[i];

        if (char === '"') {
            // Check for escaped quote ""
            if (i + 1 < csvString.length && csvString[i+1] === '"') {
                i++; // Skip the second quote of an escaped pair
                continue;
            }
            inQuotes = !inQuotes;
        }

        if (char === '\n' && !inQuotes) {
            records.push(csvString.substring(currentRecordStart, i));
            currentRecordStart = i + 1;
        }
    }
    // Add the last record if any (or the only record if no newlines)
    if (currentRecordStart < csvString.length) {
        records.push(csvString.substring(currentRecordStart));
    }
    
    return records
        .map(record => record.trim()) // Trim whitespace from each record
        .filter(record => record.length > 0 && !/^\s*$/.test(record)); // Remove empty/whitespace-only lines
}


export function parseQuizCsv(csvContent: string): Quiz {
  // Use the more robust record splitter
  const records = splitCsvToRecords(csvContent);

  const questions: Question[] = [];
  let currentQuestion: Partial<Question> | null = null;
  let currentLineNumber = 0; // This will now represent record number

  for (const rawRecord of records) {
    currentLineNumber++;
    // splitCsvRow now processes a single, complete logical record
    const row = splitCsvRow(rawRecord); 
    const typeOrKey = getValue(row, 0, '').toLowerCase();
    const value = getValue(row, 1, '');
    const value2 = getValue(row, 2, '');
    const value3 = getValue(row, 3, '');
    const value4 = getValue(row, 4, '');
    const value5 = getValue(row, 5, '');


    if (typeOrKey === 'newquestion') {
      if (currentQuestion) {
          if (currentQuestion.type && currentQuestion.title && currentQuestion.questionText && currentQuestion.points !== undefined) {
              questions.push(currentQuestion as Question);
          } else {
              console.warn(`[Record ${currentLineNumber}] Skipping incomplete question started before this record. Missing type, title, text, or points. Title: ${currentQuestion.title || 'N/A'}`);
          }
      }
      const questionTypeCode = value as QuestionType;
      const knownTypes: QuestionType[] = ['WR', 'SA', 'M', 'MC', 'TF', 'MS', 'O'];
      if (!knownTypes.includes(questionTypeCode)) {
          console.warn(`[Record ${currentLineNumber}] Unknown question type '${questionTypeCode}'. Skipping this 'NewQuestion' entry.`);
          currentQuestion = null; 
          continue;
      }
      currentQuestion = { type: questionTypeCode, points: 1 }; 
      continue; 
    }

    if (!currentQuestion) {
      continue;
    }

    try { 
        switch (typeOrKey) {
          case 'id':
            currentQuestion.id = value;
            break;
          case 'title':
            currentQuestion.title = value;
            break;
          case 'questiontext':
            currentQuestion.questionText = value; // `value` is row[1], which should now be the full HTML
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
            let feedbackAssigned = false;
            if (currentQuestion.type === 'MC' && (currentQuestion as Partial<MultipleChoiceQuestion>).options?.length > 0) {
                 const mc = currentQuestion as Partial<MultipleChoiceQuestion>;
                 if(mc.options) mc.options[mc.options.length - 1].feedback = value; feedbackAssigned = true;
            } else if (currentQuestion.type === 'MS' && (currentQuestion as Partial<MultiSelectQuestion>).options?.length > 0) {
                 const ms = currentQuestion as Partial<MultiSelectQuestion>;
                 if(ms.options) ms.options[ms.options.length - 1].feedback = value; feedbackAssigned = true;
            } else if (currentQuestion.type === 'TF') {
                const tf = currentQuestion as Partial<TrueFalseQuestion>;
                if(tf.falseOption && (!tf.trueOption || (tf.falseOption.definedLine && tf.trueOption.definedLine && tf.falseOption.definedLine > tf.trueOption.definedLine)) ){
                    tf.falseOption.feedback = value; feedbackAssigned = true;
                } else if (tf.trueOption) {
                    tf.trueOption.feedback = value; feedbackAssigned = true;
                }
            } else if (currentQuestion.type === 'O' && (currentQuestion as Partial<OrderingQuestion>).items?.length > 0) {
                 const oq = currentQuestion as Partial<OrderingQuestion>;
                 if(oq.items) oq.items[oq.items.length - 1].feedback = value; feedbackAssigned = true;
            }
            if (!feedbackAssigned) {
                currentQuestion.feedback = value;
            }
            break;

          case 'initialtext':
            (currentQuestion as Partial<WrittenResponseQuestion>).initialText = value;
            break;
          case 'answerkey':
            (currentQuestion as Partial<WrittenResponseQuestion>).answerKey = value;
            break;

          case 'inputbox':
            (currentQuestion as Partial<ShortAnswerQuestion>).inputBox = {
              rows: safeParseInt(value, 1),
              cols: safeParseInt(value2, 40),
            };
            break;
          case 'answer': 
            if (currentQuestion.type === 'SA') {
                const sa = currentQuestion as Partial<ShortAnswerQuestion>;
                sa.bestAnswer = value2; 
                const flag = value3.toLowerCase();
                sa.evaluation = flag === 'regexp' ? 'regexp' : (flag === 'sensitive' ? 'sensitive' : 'insensitive');
            } else {
                 console.warn(`[Record ${currentLineNumber}] 'Answer' row encountered for non-SA question type: ${currentQuestion.type}. Ignoring.`);
            }
            break;

           case 'scoring':
             if (currentQuestion.type === 'M') {
                 (currentQuestion as Partial<MatchingQuestion>).scoring = value as MatchingQuestion['scoring'];
             } else if (currentQuestion.type === 'MS') {
                 (currentQuestion as Partial<MultiSelectQuestion>).scoring = value as MultiSelectQuestion['scoring'];
             } else if (currentQuestion.type === 'O') {
                (currentQuestion as Partial<OrderingQuestion>).scoring = value as OrderingQuestion['scoring'];
             } else {
                 console.warn(`[Record ${currentLineNumber}] 'Scoring' row encountered for incompatible question type: ${currentQuestion.type}. Ignoring.`);
             }
            break;

          case 'choice': 
            if (currentQuestion.type === 'M') {
              const mq = currentQuestion as Partial<MatchingQuestion>;
              if (!mq.pairs) mq.pairs = [];
              const choiceNo = safeParseInt(value);
              if (choiceNo <= 0) {
                  console.warn(`[Record ${currentLineNumber}] Invalid Choice number '${value}' for Matching question '${mq.title}'. Skipping choice.`);
                  continue;
              }
              let pair = mq.pairs.find(p => p.choiceNo === choiceNo);
              if (pair) {
                  pair.choiceText = value2; 
              } else {
                  mq.pairs.push({ choiceNo: choiceNo, choiceText: value2, matchText: '' }); 
              }
            } else {
                 console.warn(`[Record ${currentLineNumber}] 'Choice' row encountered for non-Matching question type: ${currentQuestion.type}. Ignoring.`);
            }
            break;
           case 'match': 
             if (currentQuestion.type === 'M') {
               const mq = currentQuestion as Partial<MatchingQuestion>;
               if (!mq.pairs) mq.pairs = [];
               const choiceNo = safeParseInt(value);
               if (choiceNo <= 0) {
                   console.warn(`[Record ${currentLineNumber}] Invalid Match number '${value}' for Matching question '${mq.title}'. Skipping match.`);
                   continue;
               }
               let pair = mq.pairs.find(p => p.choiceNo === choiceNo);
               if (pair) {
                   pair.matchText = value2; 
               } else {
                   console.warn(`[Record ${currentLineNumber}] Matching question '${mq.title}' has Match row for non-existent Choice number ${choiceNo}. Creating placeholder choice.`);
                   mq.pairs.push({ choiceNo: choiceNo, choiceText: `[Choice ${choiceNo} Placeholder]`, matchText: value2 });
               }
             } else {
                  console.warn(`[Record ${currentLineNumber}] 'Match' row encountered for non-Matching question type: ${currentQuestion.type}. Ignoring.`);
             }
             break;

          case 'option': 
            if (currentQuestion.type === 'MC') {
              const mcq = currentQuestion as Partial<MultipleChoiceQuestion>;
              if (!mcq.options) mcq.options = [];
              mcq.options.push({
                percent: safeParseInt(value),
                text: value2,
                htmlFlag: value3.toLowerCase() === 'html',
                feedback: value4 || undefined, 
                feedbackHtmlFlag: value5.toLowerCase() === 'html', 
              });
            } else if (currentQuestion.type === 'MS') {
              const msq = currentQuestion as Partial<MultiSelectQuestion>;
              if (!msq.options) msq.options = [];
              msq.options.push({
                weight: safeParseInt(value, 0), 
                text: value2, 
                htmlFlag: value3.toLowerCase() === 'html', 
                feedback: value4 || undefined, 
                feedbackHtmlFlag: value5.toLowerCase() === 'html', 
              });
            } else {
                 console.warn(`[Record ${currentLineNumber}] 'Option' row encountered for incompatible question type: ${currentQuestion.type}. Ignoring.`);
            }
            break;

          case 'true':
            if (currentQuestion.type === 'TF') {
              const tfq = (currentQuestion as Partial<TrueFalseQuestion>);
              tfq.trueOption = {
                isTrue: true,
                credit: safeParseInt(value), 
                feedback: value2 || undefined, 
                htmlFlag: value3.toLowerCase() === 'html', 
                definedLine: currentLineNumber, 
              };
            } else {
                 console.warn(`[Record ${currentLineNumber}] 'True' row encountered for non-TF question type: ${currentQuestion.type}. Ignoring.`);
            }
            break;
          case 'false':
            if (currentQuestion.type === 'TF') {
              const tfq = (currentQuestion as Partial<TrueFalseQuestion>);
              tfq.falseOption = {
                isTrue: false,
                credit: safeParseInt(value), 
                feedback: value2 || undefined, 
                htmlFlag: value3.toLowerCase() === 'html', 
                definedLine: currentLineNumber, 
              };
            } else {
                 console.warn(`[Record ${currentLineNumber}] 'False' row encountered for non-TF question type: ${currentQuestion.type}. Ignoring.`);
            }
            break;

          case 'item': 
            if (currentQuestion.type === 'O') {
              const oq = currentQuestion as Partial<OrderingQuestion>;
              if (!oq.items) oq.items = [];
              oq.items.push({
                text: value, 
                htmlFlag: value2.toLowerCase() === 'html', 
                feedback: value3 || undefined, 
                feedbackHtmlFlag: value5.toLowerCase() === 'html', 
              });
            } else {
                 console.warn(`[Record ${currentLineNumber}] 'Item' row encountered for non-Ordering question type: ${currentQuestion.type}. Ignoring.`);
            }
            break;

          default:
             if (typeOrKey && typeOrKey.trim() !== '') { 
                 console.log(`[Record ${currentLineNumber}] Ignoring unrecognized row type or key: '${typeOrKey}'`);
             }
            break;
        }
    } catch (e) {
        console.error(`[Record ${currentLineNumber}] Error processing record: ${rawRecord}. Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

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
    } else if (currentQuestion.type === 'SA' && currentQuestion.bestAnswer === undefined) { 
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

