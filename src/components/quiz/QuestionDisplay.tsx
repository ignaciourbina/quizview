"use client";

import type React from 'react';
import type { Question } from '@/types/quiz';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, HelpCircle, Image as ImageIcon, ListOrdered, MessageSquare, MousePointerSquareDashed, CheckSquare, AlignJustify, Check, X } from 'lucide-react';

// Helper to get icon based on question type
const getQuestionIcon = (type: Question['type']): React.ReactElement => {
    switch (type) {
        case 'WR': return <MessageSquare className="h-5 w-5 mr-2 text-primary" />;
        case 'SA': return <Input className="h-5 w-5 mr-2 text-primary" />; // Using input icon for SA
        case 'M': return <ListOrdered className="h-5 w-5 mr-2 text-primary" />;
        case 'MC': return <AlignJustify className="h-5 w-5 mr-2 text-primary" />;
        case 'TF': return <HelpCircle className="h-5 w-5 mr-2 text-primary" />; // Using HelpCircle for T/F
        case 'MS': return <CheckSquare className="h-5 w-5 mr-2 text-primary" />;
        case 'O': return <ListOrdered className="h-5 w-5 mr-2 text-primary" />;
        default: return <AlertCircle className="h-5 w-5 mr-2 text-muted-foreground" />;
    }
};

// Helper to render HTML safely (basic implementation)
const RenderHtml = ({ content }: { content?: string }) => {
    if (!content) return null;
    // WARNING: In a real app, use a proper sanitizer library like DOMPurify
    // to prevent XSS attacks before using dangerouslySetInnerHTML.
    // This basic version assumes trusted content.
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
};


export function QuestionDisplay({ question, index }: { question: Question; index: number }) {
  const QuestionIcon = getQuestionIcon(question.type);

  return (
    <Card className="mb-6 shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className='flex items-center'>
            {QuestionIcon}
            <CardTitle className="text-lg font-semibold">Question {index + 1}: {question.title}</CardTitle>
        </div>
        <Badge variant="secondary">{question.points} Point{question.points !== 1 ? 's' : ''}</Badge>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4 text-base">
           <RenderHtml content={question.questionText} />
        </CardDescription>

        {question.image && (
          <div className="mb-4 p-2 border rounded-md bg-secondary flex items-center justify-center">
            <ImageIcon className="h-6 w-6 mr-2 text-muted-foreground" />
            <span className="text-muted-foreground italic">Image placeholder: {question.image}</span>
            {/* In a real app, you might fetch and display the image:
            <img src={`/path/to/images/${question.image}`} alt={question.title} className="max-w-full h-auto rounded" />
            */}
          </div>
        )}

        {/* Render question-specific content */}
        {question.type === 'WR' && (
          <div>
            <Textarea placeholder="Enter your response here..." defaultValue={question.initialText || ''} rows={5} className="mb-2" readOnly/>
            {question.answerKey && <p className="text-sm text-muted-foreground mt-2"><strong>Answer Key:</strong> {question.answerKey}</p>}
          </div>
        )}

        {question.type === 'SA' && (
          <div>
            <Input placeholder="Enter your answer" className="mb-2" style={{ width: `${question.inputBox.cols}ch`, minHeight: `${question.inputBox.rows * 1.5}em` }} readOnly />
            <p className="text-sm text-muted-foreground"><strong>Correct Answer:</strong> {question.bestAnswer} ({question.evaluation})</p>
          </div>
        )}

        {question.type === 'M' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Choices</h4>
              <ul className="space-y-2">
                {question.pairs.map(pair => (
                  <li key={`choice-${pair.choiceNo}`} className="p-2 border rounded-md bg-secondary/50">{pair.choiceText}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Matches</h4>
              <ul className="space-y-2">
                 {question.pairs.map(pair => (
                   <li key={`match-${pair.choiceNo}`} className="p-2 border rounded-md bg-secondary/50">{pair.matchText}</li>
                 ))}
              </ul>
            </div>
             <p className="text-sm text-muted-foreground md:col-span-2"><strong>Scoring:</strong> {question.scoring}</p>
          </div>
        )}

        {question.type === 'MC' && (
          <RadioGroup className="space-y-2">
            {question.options.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-secondary/30">
                <RadioGroupItem value={option.text} id={`mc-${index}-${idx}`} />
                <Label htmlFor={`mc-${index}-${idx}`} className="flex-1 cursor-pointer">
                    <RenderHtml content={option.text} />
                    {option.feedback && <p className="text-xs text-muted-foreground italic ml-4"><RenderHtml content={option.feedback} /></p>}
                </Label>
                 {option.percent === 100 && <Check className="h-4 w-4 text-green-600" />}
                 {option.percent > 0 && option.percent < 100 && <span className="text-xs text-orange-600 font-semibold">({option.percent}%)</span>}
              </div>
            ))}
          </RadioGroup>
        )}

        {question.type === 'TF' && (
          <RadioGroup className="space-y-2">
            <div className="flex items-center space-x-2 p-2 border rounded-md hover:bg-secondary/30">
                <RadioGroupItem value="true" id={`tf-${index}-true`} />
                <Label htmlFor={`tf-${index}-true`} className="flex-1 cursor-pointer">
                    True
                     {question.trueOption.feedback && <p className="text-xs text-muted-foreground italic ml-4"><RenderHtml content={question.trueOption.feedback} /></p>}
                </Label>
                 {question.trueOption.credit === 100 && <Check className="h-4 w-4 text-green-600" />}
            </div>
             <div className="flex items-center space-x-2 p-2 border rounded-md hover:bg-secondary/30">
                <RadioGroupItem value="false" id={`tf-${index}-false`} />
                 <Label htmlFor={`tf-${index}-false`} className="flex-1 cursor-pointer">
                    False
                    {question.falseOption.feedback && <p className="text-xs text-muted-foreground italic ml-4"><RenderHtml content={question.falseOption.feedback} /></p>}
                 </Label>
                {question.falseOption.credit === 100 && <Check className="h-4 w-4 text-green-600" />}
            </div>
          </RadioGroup>
        )}

        {question.type === 'MS' && (
          <div className="space-y-2">
            {question.options.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-secondary/30">
                <Checkbox id={`ms-${index}-${idx}`} />
                <Label htmlFor={`ms-${index}-${idx}`} className="flex-1 cursor-pointer">
                   <RenderHtml content={option.text} />
                   {option.feedback && <p className="text-xs text-muted-foreground italic ml-4"><RenderHtml content={option.feedback} /></p>}
                </Label>
                 {option.weight > 0 && <Check className="h-4 w-4 text-green-600" />}
              </div>
            ))}
             <p className="text-sm text-muted-foreground pt-2"><strong>Scoring:</strong> {question.scoring}</p>
          </div>
        )}

        {question.type === 'O' && (
           <div>
             <p className="text-sm font-medium mb-2">Items (Correct Order):</p>
             <ul className="space-y-2">
                {question.items.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2 p-2 border rounded-md bg-secondary/50">
                     <span className="font-semibold">{idx + 1}.</span>
                     <div className='flex-1'>
                        <RenderHtml content={item.text} />
                        {item.feedback && <p className="text-xs text-muted-foreground italic ml-4"><RenderHtml content={item.feedback} /></p>}
                     </div>
                  </li>
                ))}
             </ul>
             <p className="text-sm text-muted-foreground mt-2"><strong>Scoring:</strong> {question.scoring}</p>
           </div>
        )}

      </CardContent>
        {(question.hint || question.feedback || question.difficulty || question.id) && (
            <CardFooter className="flex flex-col items-start text-sm text-muted-foreground space-y-1 pt-4 border-t">
                {question.difficulty && <p><strong>Difficulty:</strong> {question.difficulty}/10</p>}
                {question.hint && <p><strong>Hint:</strong> <RenderHtml content={question.hint} /></p>}
                {question.feedback && !(question.type === 'WR' || question.type === 'SA') && <p><strong>General Feedback:</strong> <RenderHtml content={question.feedback} /></p> /* Show general feedback if not WR/SA */ }
                {question.id && <p><strong>Question ID:</strong> {question.id}</p>}
            </CardFooter>
        )}
    </Card>
  );
}
