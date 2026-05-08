import { Router, type IRouter } from "express";
import { eq, sql, desc, count, avg, max } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  quizzesTable,
  questionsTable,
  choicesTable,
  correctAnswersTable,
  attemptsTable,
  attemptAnswersTable,
} from "@workspace/db";
import {
  CreateQuizBody,
  UpdateQuizBody,
  GetQuizParams,
  UpdateQuizParams,
  DeleteQuizParams,
  AddQuestionParams,
  AddQuestionBody,
  UpdateQuestionParams,
  UpdateQuestionBody,
  DeleteQuestionParams,
  SubmitAttemptParams,
  SubmitAttemptBody,
  ListAttemptsParams,
  GetQuizStatsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildQuizWithQuestions(quizId: number) {
  const [quiz] = await db
    .select()
    .from(quizzesTable)
    .where(eq(quizzesTable.id, quizId));

  if (!quiz) return null;

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.quizId, quizId))
    .orderBy(questionsTable.order);

  const questionIds = questions.map((q) => q.id);

  const allChoices =
    questionIds.length > 0
      ? await db
          .select()
          .from(choicesTable)
          .where(
            sql`${choicesTable.questionId} = ANY(ARRAY[${sql.join(questionIds.map((id) => sql`${id}`), sql`, `)}]::int[])`,
          )
      : [];

  const allCorrectAnswers =
    questionIds.length > 0
      ? await db
          .select()
          .from(correctAnswersTable)
          .where(
            sql`${correctAnswersTable.questionId} = ANY(ARRAY[${sql.join(questionIds.map((id) => sql`${id}`), sql`, `)}]::int[])`,
          )
      : [];

  const questionsWithChoices = questions.map((q) => {
    const choices = allChoices
      .filter((c) => c.questionId === q.id)
      .map((c) => ({ id: c.id, text: c.text }));
    const correct = allCorrectAnswers.find((ca) => ca.questionId === q.id);
    return {
      id: q.id,
      quizId: q.quizId,
      text: q.text,
      order: q.order,
      choices,
      correctChoiceId: correct?.choiceId ?? 0,
    };
  });

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    category: quiz.category,
    createdAt: quiz.createdAt,
    questions: questionsWithChoices,
  };
}

// List quizzes
router.get("/quizzes", async (_req, res): Promise<void> => {
  const quizzes = await db.select().from(quizzesTable).orderBy(desc(quizzesTable.createdAt));

  const result = await Promise.all(
    quizzes.map(async (quiz) => {
      const [{ questionCount }] = await db
        .select({ questionCount: count() })
        .from(questionsTable)
        .where(eq(questionsTable.quizId, quiz.id));
      const [{ attemptCount }] = await db
        .select({ attemptCount: count() })
        .from(attemptsTable)
        .where(eq(attemptsTable.quizId, quiz.id));
      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        category: quiz.category,
        createdAt: quiz.createdAt,
        questionCount: Number(questionCount),
        attemptCount: Number(attemptCount),
      };
    }),
  );

  res.json(result);
});

// Create quiz
router.post("/quizzes", async (req, res): Promise<void> => {
  const parsed = CreateQuizBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [quiz] = await db.insert(quizzesTable).values(parsed.data).returning();
  const full = await buildQuizWithQuestions(quiz.id);
  res.status(201).json(full);
});

// Get quiz
router.get("/quizzes/:id", async (req, res): Promise<void> => {
  const params = GetQuizParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const full = await buildQuizWithQuestions(params.data.id);
  if (!full) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }
  res.json(full);
});

// Update quiz
router.put("/quizzes/:id", async (req, res): Promise<void> => {
  const params = UpdateQuizParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateQuizBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.update(quizzesTable).set(parsed.data).where(eq(quizzesTable.id, params.data.id));
  const full = await buildQuizWithQuestions(params.data.id);
  if (!full) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }
  res.json(full);
});

// Delete quiz
router.delete("/quizzes/:id", async (req, res): Promise<void> => {
  const params = DeleteQuizParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(quizzesTable).where(eq(quizzesTable.id, params.data.id));
  res.sendStatus(204);
});

// Add question
router.post("/quizzes/:id/questions", async (req, res): Promise<void> => {
  const params = AddQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(questionsTable.order) })
    .from(questionsTable)
    .where(eq(questionsTable.quizId, params.data.id));

  const order = (maxOrder ?? -1) + 1;

  const [question] = await db
    .insert(questionsTable)
    .values({ quizId: params.data.id, text: parsed.data.text, order })
    .returning();

  const choiceInserts = parsed.data.choices.map((text: string) => ({
    questionId: question.id,
    text,
  }));
  const insertedChoices = await db.insert(choicesTable).values(choiceInserts).returning();

  const correctChoice = insertedChoices[parsed.data.correctChoiceIndex];
  await db.insert(correctAnswersTable).values({
    questionId: question.id,
    choiceId: correctChoice.id,
  });

  res.status(201).json({
    id: question.id,
    quizId: question.quizId,
    text: question.text,
    order: question.order,
    choices: insertedChoices.map((c) => ({ id: c.id, text: c.text })),
    correctChoiceId: correctChoice.id,
  });
});

// Submit attempt
router.post("/quizzes/:id/attempts", async (req, res): Promise<void> => {
  const params = SubmitAttemptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SubmitAttemptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.quizId, params.data.id));

  const questionIds = questions.map((q) => q.id);
  const allCorrectAnswers =
    questionIds.length > 0
      ? await db
          .select()
          .from(correctAnswersTable)
          .where(
            sql`${correctAnswersTable.questionId} = ANY(ARRAY[${sql.join(questionIds.map((id) => sql`${id}`), sql`, `)}]::int[])`,
          )
      : [];

  const allChoices =
    questionIds.length > 0
      ? await db
          .select()
          .from(choicesTable)
          .where(
            sql`${choicesTable.questionId} = ANY(ARRAY[${sql.join(questionIds.map((id) => sql`${id}`), sql`, `)}]::int[])`,
          )
      : [];

  let score = 0;
  const answerResults = parsed.data.answers.map((answer: { questionId: number; choiceId: number }) => {
    const correct = allCorrectAnswers.find((ca) => ca.questionId === answer.questionId);
    const isCorrect = correct?.choiceId === answer.choiceId;
    if (isCorrect) score++;

    const question = questions.find((q) => q.id === answer.questionId);
    const chosenChoice = allChoices.find((c) => c.id === answer.choiceId);
    const correctChoice = allChoices.find((c) => c.id === correct?.choiceId);

    return {
      questionId: answer.questionId,
      questionText: question?.text ?? "",
      choiceId: answer.choiceId,
      choiceText: chosenChoice?.text ?? "",
      correctChoiceId: correct?.choiceId ?? 0,
      correctChoiceText: correctChoice?.text ?? "",
      isCorrect,
    };
  });

  const total = questions.length;
  const percentage = total > 0 ? (score / total) * 100 : 0;

  const [attempt] = await db
    .insert(attemptsTable)
    .values({ quizId: params.data.id, playerName: parsed.data.playerName, score, total })
    .returning();

  if (parsed.data.answers.length > 0) {
    await db.insert(attemptAnswersTable).values(
      parsed.data.answers.map((a: { questionId: number; choiceId: number }) => ({
        attemptId: attempt.id,
        questionId: a.questionId,
        choiceId: a.choiceId,
      })),
    );
  }

  res.status(201).json({
    id: attempt.id,
    quizId: attempt.quizId,
    playerName: attempt.playerName,
    score: attempt.score,
    total: attempt.total,
    percentage,
    answers: answerResults,
    completedAt: attempt.completedAt,
  });
});

// List attempts
router.get("/quizzes/:id/attempts/list", async (req, res): Promise<void> => {
  const params = ListAttemptsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const attempts = await db
    .select()
    .from(attemptsTable)
    .where(eq(attemptsTable.quizId, params.data.id))
    .orderBy(desc(attemptsTable.score), desc(attemptsTable.completedAt))
    .limit(20);

  const result = attempts.map((a) => ({
    id: a.id,
    quizId: a.quizId,
    playerName: a.playerName,
    score: a.score,
    total: a.total,
    percentage: a.total > 0 ? (a.score / a.total) * 100 : 0,
    answers: [],
    completedAt: a.completedAt,
  }));

  res.json(result);
});

// Quiz stats
router.get("/quizzes/:id/stats", async (req, res): Promise<void> => {
  const params = GetQuizStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [stats] = await db
    .select({
      totalAttempts: count(),
      averageScore: avg(sql<number>`${attemptsTable.score}::float / NULLIF(${attemptsTable.total}, 0) * 100`),
      topScore: max(attemptsTable.score),
    })
    .from(attemptsTable)
    .where(eq(attemptsTable.quizId, params.data.id));

  let topScorer = "";
  if (Number(stats.totalAttempts) > 0) {
    const [top] = await db
      .select({ playerName: attemptsTable.playerName })
      .from(attemptsTable)
      .where(eq(attemptsTable.quizId, params.data.id))
      .orderBy(desc(attemptsTable.score), desc(attemptsTable.completedAt))
      .limit(1);
    topScorer = top?.playerName ?? "";
  }

  res.json({
    quizId: params.data.id,
    totalAttempts: Number(stats.totalAttempts),
    averageScore: Number(stats.averageScore ?? 0),
    topScore: Number(stats.topScore ?? 0),
    topScorer,
  });
});

// Summary stats
router.get("/stats/summary", async (_req, res): Promise<void> => {
  const [{ totalQuizzes }] = await db.select({ totalQuizzes: count() }).from(quizzesTable);
  const [{ totalAttempts }] = await db.select({ totalAttempts: count() }).from(attemptsTable);
  const [{ totalPlayers }] = await db
    .select({ totalPlayers: sql<number>`COUNT(DISTINCT ${attemptsTable.playerName})` })
    .from(attemptsTable);

  const recentAttempts = await db
    .select({
      playerName: attemptsTable.playerName,
      score: attemptsTable.score,
      total: attemptsTable.total,
      completedAt: attemptsTable.completedAt,
      quizTitle: quizzesTable.title,
    })
    .from(attemptsTable)
    .innerJoin(quizzesTable, eq(attemptsTable.quizId, quizzesTable.id))
    .orderBy(desc(attemptsTable.completedAt))
    .limit(10);

  res.json({
    totalQuizzes: Number(totalQuizzes),
    totalAttempts: Number(totalAttempts),
    totalPlayers: Number(totalPlayers),
    recentAttempts: recentAttempts.map((a) => ({
      playerName: a.playerName,
      quizTitle: a.quizTitle,
      score: a.score,
      total: a.total,
      percentage: a.total > 0 ? (a.score / a.total) * 100 : 0,
      completedAt: a.completedAt,
    })),
  });
});

export default router;
