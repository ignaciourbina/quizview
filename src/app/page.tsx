"use client";

import type React from 'react';
import { useState } from 'react';
import { FileUpload } from '@/components/quiz/FileUpload';
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay';
import { parseQuizCsv } from '@/lib/csvParser';
import type { Quiz, Question } from '@/types/quiz';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function Home() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileProcess = (csvContent: string, name: string) => {
    setIsLoading(true);
    setError(null);
    setFileName(name); // Store the filename
    try {
      // Simulate parsing delay
      setTimeout(() => {
        const parsedQuiz = parseQuizCsv(csvContent);
        // Basic validation: Check if any questions were parsed
        if (!parsedQuiz || !parsedQuiz.questions || parsedQuiz.questions.length === 0) {
            setError("Could not parse any valid questions from the CSV. Please check the file format.");
            setQuiz(null);
        } else {
            setQuiz(parsedQuiz);
            console.log("Parsed Quiz:", parsedQuiz); // Log parsed data for debugging
        }
        setIsLoading(false);
      }, 500); // 0.5 second delay simulation

    } catch (err) {
      console.error("Error parsing CSV:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during parsing.");
      setQuiz(null);
      setIsLoading(false);
    }
  };

   const handleFileReject = (reason: string) => {
        setError(`File rejected: ${reason}`);
        setQuiz(null);
        setFileName(null);
        setIsLoading(false);
    };

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">QuizView</h1>
        <p className="text-muted-foreground">Preview your Brightspace Quiz CSV</p>
      </header>

      <section className="mb-8">
        <FileUpload
          onFileAccepted={handleFileProcess}
          onFileRejected={handleFileReject}
          isLoading={isLoading}
          />
      </section>

       {error && (
         <Alert variant="destructive" className="mb-8">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Parsing Error</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
       )}

      {quiz && !error && (
        <section>
            <div className="mb-6 p-4 border border-green-300 bg-green-50 rounded-md flex items-center">
                <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                <div>
                     <h2 className="text-xl font-semibold text-green-800">Quiz Preview: {fileName}</h2>
                     <p className="text-sm text-green-700">{quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''} loaded.</p>
                </div>
            </div>
            {quiz.questions.map((question, index) => (
                 // Add a key based on index and maybe question title/id for stability
                <QuestionDisplay key={`${index}-${question.id || question.title}`} question={question} index={index} />
            ))}
        </section>
      )}

       {!quiz && !error && !isLoading && (
            <div className="text-center text-muted-foreground mt-12">
                <p>Upload a Brightspace quiz CSV file to begin the preview.</p>
            </div>
        )}

    </main>
  );
}
