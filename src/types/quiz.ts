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
  feedback?: string;
}

export interface WrittenResponseQuestion extends BaseQuestion {
  type: 'WR';
  initialText?: string;
  answerKey?: string;
}

export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'SA';
  bestAnswer: string;
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
  percent: number;
  feedback?: string;
  htmlFlag: boolean;
  feedbackHtmlFlag: boolean;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'MC';
  options: MCOption[];
}

export interface TFOption {
  isTrue: boolean;
  credit: number;
  feedback?: string;
  htmlFlag: boolean; // Added based on D2L sample
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'TF';
  trueOption: TFOption;
  falseOption: TFOption;
}

export interface MSOption {
  text: string;
  weight: number; // 0 or 1 typically
  feedback?: string;
  htmlFlag: boolean;
  feedbackHtmlFlag: boolean;
}

export interface MultiSelectQuestion extends BaseQuestion {
  type: 'MS';
  options: MSOption[];
  scoring: 'RightAnswersLimitedSelections' | 'RightAnswers' | 'RightMinusWrong' | 'AllOrNothing';
}

export interface OrderingItem {
  text: string;
  feedback?: string;
  htmlFlag: boolean;
  feedbackHtmlFlag: boolean; // Added based on D2L sample structure
}

export interface OrderingQuestion extends BaseQuestion {
  type: 'O';
  items: OrderingItem[]; // In correct order
  scoring: 'EquallyWeighted' | 'AllOrNothing' | 'RightMinusWrong';
}

export type Question =
  | WrittenResponseQuestion
  | ShortAnswerQuestion
  | MatchingQuestion
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | MultiSelectQuestion
  | OrderingQuestion;

export interface Quiz {
  questions: Question[];
}
