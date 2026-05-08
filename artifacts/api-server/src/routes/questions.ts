import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  questionsTable,
  choicesTable,
  correctAnswersTable,
} from "@workspace/db";
import {
  UpdateQuestionParams,
  UpdateQuestionBody,
  DeleteQuestionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Update question
router.put("/questions/:id", async (req, res): Promise<void> => {
  const params = UpdateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(questionsTable)
    .set({ text: parsed.data.text })
    .where(eq(questionsTable.id, params.data.id));

  // Replace choices
  await db.delete(choicesTable).where(eq(choicesTable.questionId, params.data.id));

  const choiceInserts = parsed.data.choices.map((text: string) => ({
    questionId: params.data.id,
    text,
  }));
  const insertedChoices = await db.insert(choicesTable).values(choiceInserts).returning();

  const correctChoice = insertedChoices[parsed.data.correctChoiceIndex];

  await db.delete(correctAnswersTable).where(eq(correctAnswersTable.questionId, params.data.id));
  await db.insert(correctAnswersTable).values({
    questionId: params.data.id,
    choiceId: correctChoice.id,
  });

  const [question] = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.id, params.data.id));

  res.json({
    id: question.id,
    quizId: question.quizId,
    text: question.text,
    order: question.order,
    choices: insertedChoices.map((c) => ({ id: c.id, text: c.text })),
    correctChoiceId: correctChoice.id,
  });
});

// Delete question
router.delete("/questions/:id", async (req, res): Promise<void> => {
  const params = DeleteQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(questionsTable).where(eq(questionsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
