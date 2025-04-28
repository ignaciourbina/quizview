export type QuestionType = 'WR' | 'SA' | 'M' | 'MC' | 'TF' | 'MS' | 'O';

export interface BaseQuestion {
  type: QuestionType;
  id?: string; // Explicit ID
  title: string;
  questionText: string;
  points: number;
  difficulty?: number;
  image?: string;
  hint?: string;
  feedback?: string; // General feedback for the question
}

export interface WrittenResponseQuestion extends BaseQuestion {
  type: 'WR';
  initialText?: string;
  answerKey?: string;
}

export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'SA';
  bestAnswer: string; // Changed from array to single best answer based on D2L format
  evaluation: 'regexp' | 'sensitive' | 'insensitive';
  inputBox: { rows: number; cols: number };
}

export interface MatchingPair {
  choiceNo: number;
  choiceText: string;
  matchText: string;
}

export interface MatchingQuestion extends BaseQuestion {
  type: 'M';
  pairs: MatchingPair[];
  scoring: 'EquallyWeighted' | 'AllOrNothing' | 'RightMinusWrong';
}

export interface MCOption {
  text: string;
  percent: number; // Percentage credit (0-100)
  feedback?: string;
  htmlFlag: boolean;
  feedbackHtmlFlag: boolean;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'MC';
  options: MCOption[];
}

export interface TFOption {
  isTrue: boolean; // Redundant but can be useful
  credit: number; // Percentage credit (typically 100 or 0, maybe others)
  feedback?: string;
  htmlFlag: boolean;
  definedLine?: number; // Internal helper for parser
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'TF';
  trueOption: TFOption;
  falseOption: TFOption;
}

export interface MSOption {
  text: string;
  weight: number; // Positive for correct, negative for incorrect, 0 for neutral
  feedback?: string;
  htmlFlag: boolean;
  feedbackHtmlFlag: boolean;
}

export interface MultiSelectQuestion extends BaseQuestion {
  type: 'MS';
  options: MSOption[];
  // D2L has various complex scoring, simplifying here.
  // 'RightAnswersLimitedSelections' | 'RightAnswers' | 'RightMinusWrong' | 'AllOrNothing';
  scoring: string; // Store the raw scoring string for now
}

export interface OrderingItem {
  text: string;
  feedback?: string;
  htmlFlag: boolean;
  feedbackHtmlFlag: boolean;
}

export interface OrderingQuestion extends BaseQuestion {
  type: 'O';
  items: OrderingItem[]; // In correct order
  scoring: 'EquallyWeighted' | 'AllOrNothing' | 'RightMinusWrong';
}

// Union type representing any possible question format
export type Question =
  | WrittenResponseQuestion
  | ShortAnswerQuestion
  | MatchingQuestion
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | MultiSelectQuestion
  | OrderingQuestion;

// Represents the entire parsed quiz structure
export interface Quiz {
  questions: Question[];
}
