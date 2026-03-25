import React from "react";

type Difficulty = "easy" | "medium" | "hard";
type Board = number[][];

interface Puzzle {
  id: string;
  difficulty: Difficulty;
  givens: Board;
  solution: Board;
}

interface SavedGame {
  puzzle: Puzzle;
  board: Board;
  selectedCell: [number, number];
  elapsedSeconds: number;
  conflictMode: boolean;
}

const STORAGE_KEY = "shudoku-save-v2";

const TARGET_CLUES: Record<Difficulty, number> = {
  easy: 40,
  medium: 33,
  hard: 28,
};

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function inSameBox(aRow: number, aCol: number, bRow: number, bCol: number): boolean {
  return (
    Math.floor(aRow / 3) === Math.floor(bRow / 3)
    && Math.floor(aCol / 3) === Math.floor(bCol / 3)
  );
}

function formatElapsedTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function firstEditableCell(givens: Board): [number, number] {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (givens[row][col] === 0) {
        return [row, col];
      }
    }
  }

  return [0, 0];
}

function isSolved(board: Board, solution: Board): boolean {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== solution[row][col]) {
        return false;
      }
    }
  }

  return true;
}

function shuffledDigits(): number[] {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let index = digits.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [digits[index], digits[swapIndex]] = [digits[swapIndex], digits[index]];
  }
  return digits;
}

function canPlace(board: Board, row: number, col: number, value: number): boolean {
  for (let index = 0; index < 9; index += 1) {
    if (board[row][index] === value || board[index][col] === value) {
      return false;
    }
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let checkRow = startRow; checkRow < startRow + 3; checkRow += 1) {
    for (let checkCol = startCol; checkCol < startCol + 3; checkCol += 1) {
      if (board[checkRow][checkCol] === value) {
        return false;
      }
    }
  }

  return true;
}

function fillBoard(board: Board, cell = 0): boolean {
  if (cell >= 81) {
    return true;
  }

  const row = Math.floor(cell / 9);
  const col = cell % 9;

  if (board[row][col] !== 0) {
    return fillBoard(board, cell + 1);
  }

  const candidates = shuffledDigits();
  for (const value of candidates) {
    if (!canPlace(board, row, col, value)) {
      continue;
    }

    board[row][col] = value;
    if (fillBoard(board, cell + 1)) {
      return true;
    }
    board[row][col] = 0;
  }

  return false;
}

function countSolutions(board: Board, limit = 2): number {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== 0) {
        continue;
      }

      let total = 0;
      for (let value = 1; value <= 9; value += 1) {
        if (!canPlace(board, row, col, value)) {
          continue;
        }

        board[row][col] = value;
        total += countSolutions(board, limit - total);
        board[row][col] = 0;

        if (total >= limit) {
          return total;
        }
      }

      return total;
    }
  }

  return 1;
}

function generateSolvedBoard(): Board {
  const board: Board = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillBoard(board);
  return board;
}

function carvePuzzle(solution: Board, difficulty: Difficulty): Board {
  const givens = cloneBoard(solution);
  const positions = Array.from({ length: 81 }, (_, index) => index);

  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [positions[index], positions[swapIndex]] = [positions[swapIndex], positions[index]];
  }

  let clues = 81;
  const targetClues = TARGET_CLUES[difficulty];

  for (const position of positions) {
    if (clues <= targetClues) {
      break;
    }

    const row = Math.floor(position / 9);
    const col = position % 9;
    const previousValue = givens[row][col];

    givens[row][col] = 0;
    const testBoard = cloneBoard(givens);
    const solutionCount = countSolutions(testBoard, 2);

    if (solutionCount !== 1) {
      givens[row][col] = previousValue;
      continue;
    }

    clues -= 1;
  }

  return givens;
}

function generatePuzzle(difficulty: Difficulty): Puzzle {
  const solution = generateSolvedBoard();
  const givens = carvePuzzle(solution, difficulty);

  return {
    id: `generated-${difficulty}-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    difficulty,
    givens,
    solution,
  };
}

function isValidBoard(board: unknown): board is Board {
  if (!Array.isArray(board) || board.length !== 9) {
    return false;
  }

  return board.every((row) => Array.isArray(row)
    && row.length === 9
    && row.every((cell) => Number.isInteger(cell) && cell >= 0 && cell <= 9));
}

function isValidDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

function isValidPuzzle(puzzle: unknown): puzzle is Puzzle {
  if (!puzzle || typeof puzzle !== "object") {
    return false;
  }

  const candidate = puzzle as Puzzle;
  if (!isValidDifficulty(candidate.difficulty)) {
    return false;
  }

  if (typeof candidate.id !== "string") {
    return false;
  }

  if (!isValidBoard(candidate.givens) || !isValidBoard(candidate.solution)) {
    return false;
  }

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const givenValue = candidate.givens[row][col];
      if (givenValue !== 0 && givenValue !== candidate.solution[row][col]) {
        return false;
      }
    }
  }

  return true;
}

function hasConflict(board: Board, row: number, col: number, value: number): boolean {
  if (value === 0) {
    return false;
  }

  for (let index = 0; index < 9; index += 1) {
    if (index !== col && board[row][index] === value) {
      return true;
    }

    if (index !== row && board[index][col] === value) {
      return true;
    }
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let checkRow = startRow; checkRow < startRow + 3; checkRow += 1) {
    for (let checkCol = startCol; checkCol < startCol + 3; checkCol += 1) {
      if ((checkRow !== row || checkCol !== col) && board[checkRow][checkCol] === value) {
        return true;
      }
    }
  }

  return false;
}

function findConflictCells(board: Board, givens: Board): Set<string> {
  const conflicts = new Set<string>();

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = board[row][col];
      if (value === 0 || givens[row][col] !== 0) {
        continue;
      }

      if (hasConflict(board, row, col, value)) {
        conflicts.add(cellKey(row, col));
      }
    }
  }

  return conflicts;
}

const initialPuzzle = generatePuzzle("easy");

export default function GeneratedFeatureRoot(): JSX.Element {
  const [activePuzzle, setActivePuzzle] = React.useState<Puzzle>(initialPuzzle);
  const [difficulty, setDifficulty] = React.useState<Difficulty>(initialPuzzle.difficulty);
  const [board, setBoard] = React.useState<Board>(() => cloneBoard(initialPuzzle.givens));
  const [selectedCell, setSelectedCell] = React.useState<[number, number]>(() =>
    firstEditableCell(initialPuzzle.givens),
  );
  const [incorrectCells, setIncorrectCells] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [conflictMode, setConflictMode] = React.useState(true);
  const [statusMessage, setStatusMessage] = React.useState(
    "Select a cell and start entering numbers.",
  );

  const givens = activePuzzle.givens;

  React.useEffect(() => {
    const rawSave = window.localStorage.getItem(STORAGE_KEY);
    if (!rawSave) {
      return;
    }

    try {
      const parsed = JSON.parse(rawSave) as SavedGame;

      const validSelection = Array.isArray(parsed.selectedCell)
        && parsed.selectedCell.length === 2
        && Number.isInteger(parsed.selectedCell[0])
        && Number.isInteger(parsed.selectedCell[1])
        && parsed.selectedCell[0] >= 0
        && parsed.selectedCell[0] < 9
        && parsed.selectedCell[1] >= 0
        && parsed.selectedCell[1] < 9;

      if (!isValidPuzzle(parsed.puzzle) || !isValidBoard(parsed.board) || !validSelection) {
        return;
      }

      setDifficulty(parsed.puzzle.difficulty);
      setActivePuzzle(parsed.puzzle);
      setBoard(parsed.board);
      setSelectedCell(parsed.selectedCell);
      setElapsedSeconds(Math.max(0, parsed.elapsedSeconds));
      setConflictMode(Boolean(parsed.conflictMode));
      setStatusMessage(`Recovered your previous ${parsed.puzzle.difficulty} game.`);

      if (parsed.conflictMode) {
        setIncorrectCells(findConflictCells(parsed.board, parsed.puzzle.givens));
      }
    } catch {
      // Ignore malformed saved data and continue with generated default.
    }
  }, []);

  React.useEffect(() => {
    const payload: SavedGame = {
      puzzle: activePuzzle,
      board,
      selectedCell,
      elapsedSeconds,
      conflictMode,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [activePuzzle, board, selectedCell, elapsedSeconds, conflictMode]);

  const newGame = React.useCallback((mode: Difficulty) => {
    const puzzle = generatePuzzle(mode);

    setDifficulty(mode);
    setActivePuzzle(puzzle);
    setBoard(cloneBoard(puzzle.givens));
    setSelectedCell(firstEditableCell(puzzle.givens));
    setIncorrectCells(new Set());
    setElapsedSeconds(0);
    setStatusMessage(`Generated a fresh ${mode} puzzle.`);
  }, []);

  const setCellValue = React.useCallback(
    (value: number) => {
      const [row, col] = selectedCell;

      if (givens[row][col] !== 0) {
        setStatusMessage("This is a fixed clue cell.");
        return;
      }

      setBoard((prevBoard) => {
        const nextBoard = cloneBoard(prevBoard);
        nextBoard[row][col] = value;

        if (conflictMode) {
          setIncorrectCells(findConflictCells(nextBoard, givens));
        }

        return nextBoard;
      });

      if (!conflictMode) {
        setIncorrectCells((prev) => {
          const next = new Set(prev);
          next.delete(cellKey(row, col));
          return next;
        });
      }
    },
    [conflictMode, givens, selectedCell],
  );

  const moveSelection = React.useCallback(
    (deltaRow: number, deltaCol: number) => {
      setSelectedCell(([row, col]) => {
        const nextRow = (row + deltaRow + 9) % 9;
        const nextCol = (col + deltaCol + 9) % 9;
        return [nextRow, nextCol];
      });
    },
    [],
  );

  const checkBoard = React.useCallback(() => {
    const nextIncorrect = new Set<string>();

    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (givens[row][col] !== 0) {
          continue;
        }

        const value = board[row][col];
        if (value !== 0 && value !== activePuzzle.solution[row][col]) {
          nextIncorrect.add(cellKey(row, col));
        }
      }
    }

    setIncorrectCells(nextIncorrect);

    if (nextIncorrect.size === 0 && isSolved(board, activePuzzle.solution)) {
      setStatusMessage("Perfect! Puzzle solved.");
      return;
    }

    if (nextIncorrect.size === 0) {
      setStatusMessage("No conflicts found so far.");
      return;
    }

    setStatusMessage(`Found ${nextIncorrect.size} incorrect cell(s).`);
  }, [activePuzzle.solution, board, givens]);

  const resetBoard = React.useCallback(() => {
    setBoard(cloneBoard(givens));
    setIncorrectCells(new Set());
    setSelectedCell(firstEditableCell(givens));
    setElapsedSeconds(0);
    setStatusMessage("Board reset to generated clues.");
  }, [givens]);

  const applyHint = React.useCallback(() => {
    const [selectedRow, selectedCol] = selectedCell;

    if (givens[selectedRow][selectedCol] !== 0) {
      setStatusMessage("Choose an editable cell for a hint.");
      return;
    }

    const value = activePuzzle.solution[selectedRow][selectedCol];
    setCellValue(value);
    setStatusMessage(`Hint applied to row ${selectedRow + 1}, col ${selectedCol + 1}.`);
  }, [activePuzzle.solution, givens, selectedCell, setCellValue]);

  const toggleConflictMode = React.useCallback(() => {
    setConflictMode((enabled) => {
      const next = !enabled;
      if (next) {
        setIncorrectCells(findConflictCells(board, givens));
        setStatusMessage("Real-time conflict check enabled.");
      } else {
        setIncorrectCells(new Set());
        setStatusMessage("Real-time conflict check disabled.");
      }
      return next;
    });
  }, [board, givens]);

  const clearSavedProgress = React.useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setStatusMessage("Saved progress cleared for this browser.");
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (/^[1-9]$/.test(event.key)) {
        setCellValue(Number(event.key));
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        setCellValue(0);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(-1, 0);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection(1, 0);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveSelection(0, -1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveSelection(0, 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveSelection, setCellValue]);

  React.useEffect(() => {
    if (isSolved(board, activePuzzle.solution)) {
      setStatusMessage("Great job! You completed the puzzle.");
    }
  }, [activePuzzle.solution, board]);

  const solved = React.useMemo(
    () => isSolved(board, activePuzzle.solution),
    [activePuzzle.solution, board],
  );

  React.useEffect(() => {
    if (solved) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [solved]);

  const completionCount = React.useMemo(() => {
    let count = 0;

    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (board[row][col] !== 0) {
          count += 1;
        }
      }
    }

    return count;
  }, [board]);

  const [selectedRow, selectedCol] = selectedCell;
  const selectedValue = board[selectedRow][selectedCol];

  return (
    <div className="app-shell">
      <main className="panel" aria-live="polite">
        <h1>Shudoku</h1>
        <p>
          Generated Sudoku mode: each new game is built on the fly and carved by
          difficulty.
        </p>

        <div className="toolbar" role="group" aria-label="Sudoku controls">
          <button type="button" onClick={() => newGame("easy")}>Generate Easy</button>
          <button type="button" onClick={() => newGame("medium")}>Generate Medium</button>
          <button type="button" onClick={() => newGame("hard")}>Generate Hard</button>
          <button type="button" onClick={resetBoard}>Reset</button>
          <button type="button" onClick={checkBoard}>Check</button>
          <button type="button" onClick={applyHint}>Hint</button>
          <button
            type="button"
            aria-pressed={conflictMode}
            className={conflictMode ? "toggle-button active" : "toggle-button"}
            onClick={toggleConflictMode}
          >
            Live Check {conflictMode ? "On" : "Off"}
          </button>
          <button type="button" className="subtle-button" onClick={clearSavedProgress}>
            Clear Save
          </button>
        </div>

        <div className="meta-row">
          <span>Difficulty: {difficulty}</span>
          <span>Puzzle: {activePuzzle.id.slice(-6)}</span>
          <span>Progress: {completionCount}/81</span>
          <span>Mistakes: {incorrectCells.size}</span>
          <span>Time: {formatElapsedTime(elapsedSeconds)}</span>
          <span>Auto Save: On</span>
        </div>

        {solved ? (
          <div className="success-banner" role="status" aria-live="polite">
            Puzzle complete. Great focus and consistency.
          </div>
        ) : null}

        <section className="board" aria-label="Sudoku board" role="grid">
          {board.map((row, rowIndex) => (
            <React.Fragment key={`row-${rowIndex}`}>
              {row.map((value, colIndex) => {
                const given = givens[rowIndex][colIndex] !== 0;
                const selected =
                  selectedCell[0] === rowIndex && selectedCell[1] === colIndex;
                const wrong = incorrectCells.has(cellKey(rowIndex, colIndex));
                const related =
                  rowIndex === selectedRow
                  || colIndex === selectedCol
                  || inSameBox(rowIndex, colIndex, selectedRow, selectedCol);
                const sameValue = selectedValue !== 0 && value === selectedValue;
                const classes = ["cell"];

                if (given) {
                  classes.push("cell-given");
                } else {
                  classes.push("cell-editable");
                }

                if (selected) {
                  classes.push("cell-selected");
                } else if (related) {
                  classes.push("cell-related");
                }

                if (sameValue) {
                  classes.push("cell-same-value");
                }

                if (wrong) {
                  classes.push("cell-wrong");
                }

                return (
                  <button
                    type="button"
                    role="gridcell"
                    key={cellKey(rowIndex, colIndex)}
                    className={classes.join(" ")}
                    aria-label={`Row ${rowIndex + 1}, Column ${colIndex + 1}, ${
                      value === 0 ? "empty" : `value ${value}`
                    }`}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => setSelectedCell([rowIndex, colIndex])}
                  >
                    {value === 0 ? "" : value}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </section>

        <div className="number-pad" role="group" aria-label="Number pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              type="button"
              key={`digit-${digit}`}
              aria-pressed={selectedValue === digit}
              onClick={() => setCellValue(digit)}
            >
              {digit}
            </button>
          ))}
          <button type="button" onClick={() => setCellValue(0)}>
            Clear
          </button>
        </div>

        <section className="status" aria-label="Build status">
          <strong>Game status:</strong>
          <p>{statusMessage}</p>
          <p>
            Tip: arrow keys move selection. Number keys fill values. Delete,
            Backspace, or 0 clears a cell.
          </p>
          <p>
            Live Check marks rule conflicts immediately. Turn it off if you want
            a classic manual-check experience.
          </p>
        </section>
      </main>
    </div>
  );
}
