"use server";

import { revalidatePath } from "next/cache";
import {
  InvalidReviewInputError,
  validateReviewInput,
} from "../../../lib/api/contracts";
import type { ReviewActionState } from "../../../lib/domain/types";
import { recordReview } from "../../../lib/reviewStore";

function formValue(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

export async function reviewCaseAction(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  try {
    const input = validateReviewInput({
      caseId: formValue(formData, "caseId"),
      action: formValue(formData, "action"),
      reviewer: formValue(formData, "reviewer"),
      note: formValue(formData, "note"),
      finalRecommendation: formValue(formData, "finalRecommendation"),
    });

    const record = await recordReview(input);

    revalidatePath("/");
    revalidatePath(`/cases/${record.caseId}`);

    return {
      status: "ok",
      message: "Granskningen har registrerats lokalt.",
      record,
    };
  } catch (error) {
    if (error instanceof InvalidReviewInputError) {
      return {
        status: "error",
        message: error.message,
        record: null,
      };
    }

    return {
      status: "error",
      message: "Granskningen kunde inte registreras.",
      record: null,
    };
  }
}
