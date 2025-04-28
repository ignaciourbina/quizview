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
    return arr[index] !== undefined && arr[index] !== null && arr[index] !== '' ? arr[index] : defaultValue;
}

export function parseQuizCsv(csvContent: string): Quiz {
  const rows = csvContent
    .split('\n')
    .map(row => row.trim())
    .filter(row => row.length > 0) // Remove empty lines
    .map(row => {
        // Basic CSV splitting, needs improvement for quoted fields containing commas
        // A robust library like Papaparse is recommended for production
        return row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')); // Handle simple quotes
    });

  const questions: Question[] = [];
  let currentQuestion: Partial<Question> | null = null;

  for (const row of rows) {
    const typeOrKey = getValue(row, 0, '').toLowerCase();
    const value = getValue(row, 1, '');
    const value2 = getValue(row, 2, '');
    const value3 = getValue(row, 3, '');
    const value4 = getValue(row, 4, '');
    const value5 = getValue(row, 5, '');


    if (typeOrKey === 'newquestion') {
      // Finalize the previous question before starting a new one
      if (currentQuestion && currentQuestion.type && currentQuestion.title && currentQuestion.questionText && currentQuestion.points !== undefined) {
        questions.push(currentQuestion as Question);
      }
      // Start a new question object
      const questionTypeCode = value as QuestionType;
      currentQuestion = { type: questionTypeCode, points: 1 }; // Default points to 1
      continue; // Move to the next row
    }

    if (!currentQuestion) {
      continue; // Skip rows before the first "NewQuestion"
    }

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
        // General feedback or feedback for specific question types
        if (currentQuestion.type === 'WR' || currentQuestion.type === 'SA') {
             currentQuestion.feedback = value;
        } else if (currentQuestion.type === 'MC' && (currentQuestion as MultipleChoiceQuestion).options?.length > 0) {
             // Assign to the last option added
             const mc = currentQuestion as Partial<MultipleChoiceQuestion>;
             if(mc.options && mc.options.length > 0) mc.options[mc.options.length - 1].feedback = value;
        } else if (currentQuestion.type === 'MS' && (currentQuestion as MultiSelectQuestion).options?.length > 0) {
             const ms = currentQuestion as Partial<MultiSelectQuestion>;
             if(ms.options && ms.options.length > 0) ms.options[ms.options.length - 1].feedback = value;
        } else if (currentQuestion.type === 'TF' && (currentQuestion as TrueFalseQuestion).trueOption) {
            // D2L seems less consistent here, might apply to last defined T/F row or general?
            // Assuming general for now if specific isn't targeted
             currentQuestion.feedback = value;
        } else if (currentQuestion.type === 'O' && (currentQuestion as OrderingQuestion).items?.length > 0) {
             const oq = currentQuestion as Partial<OrderingQuestion>;
              if(oq.items && oq.items.length > 0) oq.items[oq.items.length - 1].feedback = value;
        } else {
            // General Question feedback
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
            (currentQuestion as Partial<ShortAnswerQuestion>).bestAnswer = value2;
            const flag = value3.toLowerCase();
            (currentQuestion as Partial<ShortAnswerQuestion>).evaluation = flag === 'regexp' ? 'regexp' : (flag === 'sensitive' ? 'sensitive' : 'insensitive');
        }
        break;

      // Matching specific
       case 'scoring': // For M, MS, O
         if (currentQuestion.type === 'M') {
             (currentQuestion as Partial<MatchingQuestion>).scoring = value as MatchingQuestion['scoring'];
         } else if (currentQuestion.type === 'MS') {
             (currentQuestion as Partial<MultiSelectQuestion>).scoring = value as MultiSelectQuestion['scoring'];
         } else if (currentQuestion.type === 'O') {
            (currentQuestion as Partial<OrderingQuestion>).scoring = value as OrderingQuestion['scoring'];
         }
        break;
      case 'choice': // For M
        if (currentQuestion.type === 'M') {
          const mq = currentQuestion as Partial<MatchingQuestion>;
          if (!mq.pairs) mq.pairs = [];
          // Find or create pair based on choiceNo
          const choiceNo = safeParseInt(value);
          let pair = mq.pairs.find(p => p.choiceNo === choiceNo);
          if (pair) {
              pair.choiceText = value2;
          } else {
              mq.pairs.push({ choiceNo: choiceNo, choiceText: value2, matchText: '' }); // Add placeholder matchText
          }
        }
        break;
       case 'match': // For M
         if (currentQuestion.type === 'M') {
           const mq = currentQuestion as Partial<MatchingQuestion>;
           if (!mq.pairs) mq.pairs = [];
           const choiceNo = safeParseInt(value);
           let pair = mq.pairs.find(p => p.choiceNo === choiceNo);
           if (pair) {
               pair.matchText = value2;
           } else {
               // This case might indicate malformed CSV if match appears before choice
                console.warn(`Matching question '${mq.title}' has Match row for non-existent Choice number ${choiceNo}`);
               mq.pairs.push({ choiceNo: choiceNo, choiceText: '', matchText: value2 }); // Add placeholder choiceText
           }
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
            feedback: value4 || undefined,
            feedbackHtmlFlag: value5.toLowerCase() === 'html',
          });
        } else if (currentQuestion.type === 'MS') {
          const msq = currentQuestion as Partial<MultiSelectQuestion>;
          if (!msq.options) msq.options = [];
          msq.options.push({
            weight: safeParseInt(value), // D2L uses 1 for correct, 0 for incorrect
            text: value2,
            htmlFlag: value3.toLowerCase() === 'html',
            feedback: value4 || undefined,
            feedbackHtmlFlag: value5.toLowerCase() === 'html',
          });
        }
        break;

      // True/False specific
      case 'true':
        if (currentQuestion.type === 'TF') {
          (currentQuestion as Partial<TrueFalseQuestion>).trueOption = {
            isTrue: true,
            credit: safeParseInt(value),
            feedback: value2 || undefined,
            htmlFlag: value3.toLowerCase() === 'html', // Check 4th column for HTML flag
          };
        }
        break;
      case 'false':
        if (currentQuestion.type === 'TF') {
          (currentQuestion as Partial<TrueFalseQuestion>).falseOption = {
            isTrue: false,
            credit: safeParseInt(value),
            feedback: value2 || undefined,
             htmlFlag: value3.toLowerCase() === 'html', // Check 4th column for HTML flag
          };
        }
        break;


      // Ordering specific
      case 'item': // For O
        if (currentQuestion.type === 'O') {
          const oq = currentQuestion as Partial<OrderingQuestion>;
          if (!oq.items) oq.items = [];
          oq.items.push({
            text: value,
            htmlFlag: value2.toLowerCase() === 'html',
            feedback: value3 || undefined,
            feedbackHtmlFlag: value5.toLowerCase() === 'html', // D2L uses col 6 for item feedback HTML flag
          });
        }
        break;

      default:
        // Ignore unknown rows or blank separator rows
        break;
    }
  }

  // Add the last processed question if it's valid
  if (currentQuestion && currentQuestion.type && currentQuestion.title && currentQuestion.questionText && currentQuestion.points !== undefined) {
    // Final validation for specific types before pushing
    if (currentQuestion.type === 'M' && (!currentQuestion.pairs || currentQuestion.pairs.length === 0)) {
        console.warn(`Matching question '${currentQuestion.title}' skipped because it has no pairs.`);
    } else if (currentQuestion.type === 'MC' && (!currentQuestion.options || currentQuestion.options.length === 0)) {
         console.warn(`MultipleChoice question '${currentQuestion.title}' skipped because it has no options.`);
    } else if (currentQuestion.type === 'TF' && (!currentQuestion.trueOption || !currentQuestion.falseOption)) {
         console.warn(`TrueFalse question '${currentQuestion.title}' skipped because it lacks true/false options.`);
    } else if (currentQuestion.type === 'MS' && (!currentQuestion.options || currentQuestion.options.length === 0)) {
         console.warn(`MultiSelect question '${currentQuestion.title}' skipped because it has no options.`);
    } else if (currentQuestion.type === 'O' && (!currentQuestion.items || currentQuestion.items.length === 0)) {
         console.warn(`Ordering question '${currentQuestion.title}' skipped because it has no items.`);
    } else if (currentQuestion.type === 'SA' && !currentQuestion.bestAnswer) {
         console.warn(`ShortAnswer question '${currentQuestion.title}' skipped because it lacks a best answer.`);
    } else {
        questions.push(currentQuestion as Question);
    }
  }


  return { questions };
}
