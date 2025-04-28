# **App Name**: QuizView

## Core Features:

- CSV Parsing: Parses a Brightspace CSV quiz file.
- Quiz Display: Displays the quiz questions in a user-friendly format, mimicking the Brightspace quiz preview.
- File Upload: Allows users to upload a CSV file via a drag-and-drop interface.

## Style Guidelines:

- Primary color: Light blue (#E0F7FA) to provide a clean and calm feel.
- Secondary color: Light gray (#F5F5F5) for backgrounds and subtle contrast.
- Accent: Teal (#008080) to highlight important elements and interactive components.
- Clean and structured layout, similar to Brightspace, using clear sections for each question.
- Use simple, clear icons for different question types (e.g., multiple choice, true/false).

## Original User Request:
An app that takes a csv quiz import file for brighstpace LMS and displays the questions as if a preview of the quiz. Consider the source code:

# -*- coding: utf-8 -*-
"""
Created on Mon Apr 28 12:48:20 2025

@author: Ignacio
"""

"""
Quiz CSV Builder for D2L Brightspace
===================================

This module lets you create any of the seven Brightspace‑supported
question types programmatically, add them to a bank, and then export the
whole set to a **CSV UTF‑8** file that is ready to import with the “Bulk
question upload” tool (Add/Edit Questions → Import → Upload a File).

It follows the exact column order/structure used in D2L’s sample
`Sample_Question_Import_UTF8.csv` so the resulting file is accepted
without manual tweaking.

Usage example
-------------
>>> from pathlib import Path
>>> from typing import List, Optional, Union # Added Union for compatibility

>>> # Define BLANK constant for padding (5 empty strings for 6 columns total)
>>> BLANK5 = ["", "", "", "", ""]

>>> # Define Question dataclass and subclasses (as provided in the original code)
>>> # ... (Assuming dataclasses like Question, WrittenResponse, MCOption, etc. are defined here) ...

>>> # Example Usage:
>>> bank = QuestionBank()
>>> q1 = WrittenResponse(
...     title="Short essay on oxidation",
...     question_text="Explain what happens during oxidation.",
...     points=3,
...     answer_key="Look for transfer of electrons",
... )
>>> bank.add(q1)
>>> q2 = MultipleChoice(
...     title="Boiling point of water",
...     question_text="What is the normal boiling point of water?",
...     options=[
...         MCOption("100 °C", 100),
...         MCOption("212 °F", 100),  # Accept either unit
...         MCOption("90 °C", 0),
...         MCOption("273 K", 0),
...     ],
... )
>>> bank.add(q2)
>>> bank.export_csv("my_quiz.csv")

After running the above you will have a **my_quiz.csv** file you can
upload straight into Brightspace.
"""

import csv
from dataclasses import dataclass, field
from pathlib import Path
# Use Union for type hints for broader Python compatibility (Python 3.7+)
from typing import List, Optional, Union

# Define a constant for blank padding to ensure 6 columns total
# Most rows start with ["Type", "Value", *BLANK4], needing 4 blanks.
# Some specific rows need 5 blanks if they only have one value (e.g., ["Scoring", value, *BLANK4])
# Let's define BLANK5 for consistency in padding to 6 columns.
BLANK5 = ["", "", "", "", ""] # Used when a row starts with only one significant value like "Title"
BLANK4 = ["", "", "", ""]     # Used when a row starts with two significant values like "NewQuestion", "Code"

@dataclass
class Question:
    """Base class for all D2L question types."""
    new_question_code: str = field(init=False, default="") # Set in subclass __post_init__
    title: str
    question_text: str
    points: int = 1
    difficulty: Optional[int] = None # D2L supports 1-10, but we don't enforce it here
    image: Optional[str] = None      # Filename of image (must be uploaded separately)
    hint: Optional[str] = None
    feedback: Optional[str] = None
    explicit_id: Optional[str] = None # Optional custom ID for the question

    def _type_rows(self) -> List[List[str]]:
        """
        Abstract method to be implemented by subclasses.
        Returns the specific rows needed for this question type.
        All rows must have 6 columns.
        """
        raise NotImplementedError("Subclasses must implement _type_rows")

    def to_rows(self) -> List[List[str]]:
        """
        Generates the list of CSV rows for this question.
        Ensures all rows have exactly 6 columns.
        """
        rows = [["NewQuestion", self.new_question_code, *BLANK4]]
        if self.explicit_id:
            rows.append(["ID", self.explicit_id, *BLANK4])
        rows.extend([
            ["Title", self.title, *BLANK4],
            ["QuestionText", self.question_text, *BLANK4],
            ["Points", str(self.points), *BLANK4]
        ])
        if self.difficulty is not None:
            rows.append(["Difficulty", str(self.difficulty), *BLANK4])
        if self.image:
            # Image path needs to be handled correctly by D2L upload process
            rows.append(["Image", self.image, *BLANK4])

        # Add type-specific rows (implemented by subclasses)
        rows.extend(self._type_rows())

        if self.hint:
            rows.append(["Hint", self.hint, *BLANK4])
        if self.feedback:
            rows.append(["Feedback", self.feedback, *BLANK4])

        # Add a blank separator row (6 empty strings) before the next question
        rows.append(["", "", "", "", "", ""]) # FIX: Ensure 6 columns
        return rows

@dataclass
class WrittenResponse(Question):
    """Written Response (WR) question type."""
    initial_text: Optional[str] = None # Pre-filled text in the response box
    answer_key: Optional[str] = None   # Model answer/notes for graders

    def __post_init__(self):
        """Set the question type code."""
        self.new_question_code = "WR"

    def _type_rows(self) -> List[List[str]]:
        """Generate WR-specific rows."""
        rows = []
        if self.initial_text is not None:
            rows.append(["InitialText", self.initial_text, *BLANK4])
        if self.answer_key is not None:
            # Note: D2L sample shows AnswerKey only having 2 columns, but bulk edit exports 6.
            # Using 6 columns for consistency, matching export behavior.
            rows.append(["AnswerKey", self.answer_key, *BLANK4])
        return rows

@dataclass
class ShortAnswer(Question):
    """Short Answer (SA) question type."""
    best_answer: str = ""        # The primary correct answer
    regexp: bool = False         # Treat best_answer as a regular expression?
    case_sensitive: bool = False # Is the comparison case-sensitive?
    rows: int = 1                # Height of the input box
    cols: int = 40               # Width of the input box

    def __post_init__(self):
        """Set code and validate required fields."""
        if not self.best_answer:
            raise ValueError("`best_answer` is required for ShortAnswer questions.")
        self.new_question_code = "SA"

    def _type_rows(self) -> List[List[str]]:
        """Generate SA-specific rows."""
        # Determine the evaluation flag based on regexp and case sensitivity
        if self.regexp:
            flag = "regexp"
        elif self.case_sensitive:
            flag = "sensitive"
        else:
            flag = "insensitive" # Default

        # Generate the rows, ensuring 6 columns each
        return [
            ["InputBox", str(self.rows), str(self.cols), "", "", ""], # FIX: Ensure 6 columns
            ["Answer", "100", self.best_answer, flag, "", ""] # FIX: Ensure 6 columns (Added weight '100')
            # Note: D2L allows multiple weighted answers, but this builder only supports one best answer.
            # The '100' signifies 100% weight for this single answer.
        ]

@dataclass
class MatchingPair:
    """Represents a single choice-match pair for a Matching question."""
    choice_no: int      # Unique number for this choice (used for linking)
    choice_text: str    # Text displayed in the 'Choices' column
    match_text: str     # Text displayed in the 'Matches' column

@dataclass
class Matching(Question):
    """Matching (M) question type."""
    pairs: List[MatchingPair] = field(default_factory=list)
    scoring: str = "EquallyWeighted" # Options: EquallyWeighted, AllOrNothing, RightMinusWrong

    def __post_init__(self):
        """Set the question type code and validate."""
        self.new_question_code = "M"
        if not self.pairs:
            raise ValueError("At least one `MatchingPair` is required for Matching questions.")
        if self.scoring not in ["EquallyWeighted", "AllOrNothing", "RightMinusWrong"]:
             raise ValueError("Invalid scoring type for Matching question.")

    def _type_rows(self) -> List[List[str]]:
        """Generate M-specific rows."""
        rows = [["Scoring", self.scoring, *BLANK4]]
        # Add all choices first
        for p in self.pairs:
            rows.append(["Choice", str(p.choice_no), p.choice_text, "", "", ""]) # FIX: Ensure 6 columns
        # Add all matches second
        for p in self.pairs:
            rows.append(["Match", str(p.choice_no), p.match_text, "", "", ""]) # FIX: Ensure 6 columns
        return rows

@dataclass
class MCOption:
    """Represents a single option for a Multiple Choice question."""
    text: str
    percent: int # Percentage credit (0-100)
    feedback: Optional[str] = None
    # D2L supports HTML in options, but this builder keeps it simple.
    # Set html_used=True if your 'text' or 'feedback' contains HTML tags.
    html_used: bool = False

    def to_row(self) -> List[str]:
        """Generates the CSV row for this MC option."""
        # Flags indicate if the corresponding field contains HTML
        html_flag = "HTML" if self.html_used else ""
        fb_flag = "HTML" if self.feedback and self.html_used else ""
        # Ensure 6 columns
        return ["Option", str(self.percent), self.text, html_flag, self.feedback or "", fb_flag]

@dataclass
class MultipleChoice(Question):
    """Multiple Choice (MC) question type."""
    options: List[MCOption] = field(default_factory=list)
    # Note: D2L also supports settings like randomization and display (vertical/horizontal)
    # which are not included in this simplified builder.

    def __post_init__(self):
        """Set the question type code and validate."""
        self.new_question_code = "MC"
        if not self.options:
            raise ValueError("At least one `MCOption` is required for MultipleChoice questions.")
        # Optional: Add validation to check if percentages sum correctly (e.g., to 100)

    def _type_rows(self) -> List[List[str]]:
        """Generate MC-specific rows from options."""
        return [o.to_row() for o in self.options]

@dataclass
class TFOption:
    """Represents the True or False row details for a True/False question."""
    is_true: bool # Is this the row for the 'True' answer or 'False'?
    credit: int   # Percentage credit (usually 100 for correct, 0 for incorrect)
    feedback: Optional[str] = None

    def to_row(self) -> List[str]:
        """Generates the CSV row for this TF option."""
        # Ensure 6 columns
        return [
            "True" if self.is_true else "False",
            str(self.credit),
            self.feedback or "",
            "", # Placeholder for HTML flag (not used here)
            "", # Placeholder
            ""  # Placeholder
        ] # FIX: Ensure 6 columns

@dataclass
class TrueFalse(Question):
    """True/False (TF) question type."""
    true_row: Optional[TFOption] = None  # Details for the 'True' response
    false_row: Optional[TFOption] = None # Details for the 'False' response

    def __post_init__(self):
        """Set code and validate required fields."""
        # FIX: Corrected syntax error and validation logic
        if self.true_row is None or self.false_row is None:
            raise ValueError("`true_row` and `false_row` must both be provided for TrueFalse questions.")
        if not self.true_row.is_true:
             raise ValueError("`true_row` must have is_true=True.")
        if self.false_row.is_true:
             raise ValueError("`false_row` must have is_true=False.")
        self.new_question_code = "TF" # Correct assignment

    def _type_rows(self) -> List[List[str]]:
        """Generate TF-specific rows."""
        # Order matters: True row first, then False row
        return [self.true_row.to_row(), self.false_row.to_row()]

@dataclass
class MSOption:
    """Represents a single option for a Multi-Select question."""
    text: str
    correct: bool # Is this option part of the correct answer?
    feedback: Optional[str] = None
    html_used: bool = False # Set to True if text/feedback contains HTML

    def to_row(self) -> List[str]:
        """Generates the CSV row for this MS option."""
        html_flag = "HTML" if self.html_used else ""
        fb_flag = "HTML" if self.feedback and self.html_used else ""
        # Weight is 1 for correct, 0 for incorrect in standard D2L format
        weight = "1" if self.correct else "0"
        # Ensure 6 columns
        return ["Option", weight, self.text, html_flag, self.feedback or "", fb_flag]

@dataclass
class MultiSelect(Question):
    """Multi-Select (MS) question type."""
    options: List[MSOption] = field(default_factory=list)
    scoring: str = "RightAnswersLimitedSelections" # Options: RightAnswersLimitedSelections, RightAnswers, RightMinusWrong, AllOrNothing

    def __post_init__(self):
        """Set the question type code and validate."""
        self.new_question_code = "MS"
        if not self.options:
            raise ValueError("At least one `MSOption` is required for MultiSelect questions.")
        # Optional: Validate scoring string
        if self.scoring not in ["RightAnswersLimitedSelections", "RightAnswers", "RightMinusWrong", "AllOrNothing"]:
             raise ValueError("Invalid scoring type for MultiSelect question.")
        # Optional: Ensure at least one option is marked correct

    def _type_rows(self) -> List[List[str]]:
        """Generate MS-specific rows."""
        rows = [["Scoring", self.scoring, *BLANK4]]
        rows.extend(o.to_row() for o in self.options)
        return rows

@dataclass
class OrderingItem:
    """Represents a single item to be ordered in an Ordering question."""
    text: str
    feedback: Optional[str] = None
    html_used: bool = False # Set to True if text/feedback contains HTML

    def to_row(self) -> List[str]:
        """Generates the CSV row for this Ordering item."""
        html_flag = "HTML" if self.html_used else ""
        fb_flag = "HTML" if self.feedback and self.html_used else ""
        # Ensure 6 columns
        # The order items appear in the list determines the correct sequence (1st item is #1)
        return ["Item", self.text, html_flag, self.feedback or "", "", fb_flag] # FIX: Ensure 6 columns (adjusted placement of fb_flag)

@dataclass
class Ordering(Question):
    """Ordering (O) question type."""
    items: List[OrderingItem] = field(default_factory=list) # Items in CORRECT order
    scoring: str = "EquallyWeighted" # Options: EquallyWeighted, AllOrNothing, RightMinusWrong

    def __post_init__(self):
        """Set the question type code and validate."""
        self.new_question_code = "O"
        if not self.items:
            raise ValueError("At least one `OrderingItem` is required for Ordering questions.")
        if self.scoring not in ["EquallyWeighted", "AllOrNothing", "RightMinusWrong"]:
             raise ValueError("Invalid scoring type for Ordering question.")

    def _type_rows(self) -> List[List[str]]:
        """Generate O-specific rows."""
        rows = [["Scoring", self.scoring, *BLANK4]]
        rows.extend(i.to_row() for i in self.items)
        return rows


# --- Question Bank Class ---

class QuestionBank:
    """Holds a collection of questions and exports them to CSV."""
    def __init__(self):
        """Initializes an empty question bank."""
        self._questions: List[Question] = []

    def add(self, *questions: Question):
        """Adds one or more Question objects to the bank."""
        self._questions.extend(questions)

    def export_csv(self, path: Union[str, Path], encoding: str = "utf-8-sig") -> Path:
        """
        Exports all questions in the bank to a D2L-compatible CSV file.

        Args:
            path: The file path (as string or Path object) where the CSV will be saved.
            encoding: The file encoding. 'utf-8-sig' includes a BOM, often needed
                      by Windows applications like Excel to correctly recognize UTF-8.

        Returns:
            The resolved Path object of the created CSV file.
        """
        # Resolve the path and ensure the parent directory exists
        p = Path(path).expanduser().resolve()
        p.parent.mkdir(parents=True, exist_ok=True)

        # Write the CSV file
        with p.open("w", newline="", encoding=encoding) as f:
            # Use csv.writer for proper CSV formatting (handling commas, quotes, etc.)
            w = csv.writer(f)
            # Iterate through each question and write its rows
            for q in self._questions:
                w.writerows(q.to_rows())

        print(f"Successfully exported {len(self._questions)} questions to: {p}")
        return p

# --- Example Usage ---
if __name__ == "__main__":
    # Create a question bank
    bank = QuestionBank()

    # Add a Written Response question
    q_wr = WrittenResponse(
        title="Essay on Photosynthesis",
        question_text="Explain the process of photosynthesis in plants.",
        points=5,
        difficulty=3,
        answer_key="Key elements: chlorophyll, sunlight, water, CO2 -> glucose, oxygen. Mention light-dependent and light-independent reactions.",
        hint="Think about what plants need to grow.",
        feedback="Photosynthesis is crucial for life on Earth."
    )
    bank.add(q_wr)

    # Add a Multiple Choice question
    q_mc = MultipleChoice(
        title="Capital of France",
        question_text="What is the capital city of France?",
        points=1,
        options=[
            MCOption("Berlin", 0, feedback="Berlin is the capital of Germany."),
            MCOption("Madrid", 0),
            MCOption("Paris", 100, feedback="Correct!"),
            MCOption("Rome", 0, feedback="Rome is the capital of Italy."),
        ],
        explicit_id="GEO-FR-CAP-01" # Optional custom ID
    )
    bank.add(q_mc)

    # Add a True/False question
    q_tf = TrueFalse(
        title="Water Boiling Point",
        question_text="Water boils at 100 degrees Celsius at standard sea level pressure.",
        points=1,
        true_row=TFOption(is_true=True, credit=100, feedback="This is the standard definition."),
        false_row=TFOption(is_true=False, credit=0, feedback="Incorrect. 100°C is the standard boiling point.")
    )
    bank.add(q_tf)

    # Add a Short Answer question
    q_sa = ShortAnswer(
        title="Chemical Symbol for Gold",
        question_text="What is the chemical symbol for Gold?",
        points=2,
        best_answer="Au",
        case_sensitive=True # Chemical symbols are case-sensitive
    )
    bank.add(q_sa)

     # Add a Multi-Select question
    q_ms = MultiSelect(
        title="Planets in Solar System",
        question_text="Select all the planets in our solar system.",
        points=4,
        scoring="RightAnswers", # Give credit for each correct selection
        options=[
            MSOption("Earth", correct=True),
            MSOption("Mars", correct=True),
            MSOption("Pluto", correct=False, feedback="Pluto is classified as a dwarf planet."),
            MSOption("Jupiter", correct=True),
            MSOption("Moon", correct=False, feedback="The Moon is a satellite of Earth."),
        ]
    )
    bank.add(q_ms)

    # Add an Ordering question
    q_o = Ordering(
        title="Order of Planets",
        question_text="Arrange the first four planets from the Sun, starting with the closest.",
        points=4,
        scoring="EquallyWeighted",
        items=[
            OrderingItem("Mercury"),
            OrderingItem("Venus"),
            OrderingItem("Earth"),
            OrderingItem("Mars"),
        ]
    )
    bank.add(q_o)

    # Add a Matching question
    q_m = Matching(
        title="Match Capitals to Countries",
        question_text="Match the capital city to its country.",
        points=3,
        scoring="AllOrNothing",
        pairs=[
            MatchingPair(choice_no=1, choice_text="Ottawa", match_text="Canada"),
            MatchingPair(choice_no=2, choice_text="Canberra", match_text="Australia"),
            MatchingPair(choice_no=3, choice_text="Tokyo", match_text="Japan"),
        ]
    )
    bank.add(q_m)


    # Export the bank to a CSV file
    try:
        output_file = bank.export_csv("d2l_quiz_export.csv")
    except Exception as e:
        print(f"An error occurred during CSV export: {e}")
  