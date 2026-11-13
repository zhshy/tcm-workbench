(function (root) {
  "use strict";

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function isExactAnswer(actual, expected) {
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual) || actual.length !== expected.length) return false;
      var a = actual.slice().sort(function (x, y) { return x - y; });
      var b = expected.slice().sort(function (x, y) { return x - y; });
      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    }
    return actual === expected;
  }

  function answerLabel(question, answer) {
    var values = Array.isArray(answer) ? answer : [answer];
    return values.slice().sort(function (a, b) { return a - b; }).map(function (index) {
      return String.fromCharCode(65 + index) + ". " + question.o[index];
    }).join("；");
  }

  function wrongCandidate(question) {
    var correct = question.a;
    if (Array.isArray(correct)) {
      var candidate = correct.slice();
      var alternative = question.o.findIndex(function (_, index) { return correct.indexOf(index) < 0; });
      if (candidate.length > 1) candidate.pop();
      else if (alternative >= 0) candidate.push(alternative);
      return candidate.sort(function (a, b) { return a - b; });
    }
    var wrong = question.o.findIndex(function (_, index) { return index !== correct; });
    return wrong >= 0 ? wrong : correct;
  }

  function buildComposite(lesson) {
    var questions = (lesson && Array.isArray(lesson.q) ? lesson.q : []).slice(0, 4);
    var items = questions.map(function (question, index) {
      var candidate = (index === 0 || index === 2)
        ? clone(question.a)
        : wrongCandidate(question);
      return {
        id: (question.lesson_id || ("D" + String(lesson.d).padStart(3, "0"))) + "-Q07-" + String.fromCharCode(65 + index),
        source_question_id: question.id,
        stem: question.q,
        candidate_answer: candidate,
        candidate_label: answerLabel(question, candidate),
        answer: isExactAnswer(candidate, question.a),
        explanation: question.e || "",
        source_refs: Array.isArray(question.source_refs) ? question.source_refs.slice() : [],
        source_status: question.source_status || "needs_manual_source_review",
        knowledge_ids: Array.isArray(question.knowledge_ids) ? question.knowledge_ids.slice() : []
      };
    });

    return {
      id: "D" + String(lesson && lesson.d || 0).padStart(3, "0") + "-Q07",
      lesson_id: "D" + String(lesson && lesson.d || 0).padStart(3, "0"),
      type: "composite_objective",
      title: "本课核心知识综合核验",
      stimulus: {
        goal: lesson && lesson.goal || "",
        key_points: lesson && Array.isArray(lesson.pts) ? lesson.pts.slice(0, 3) : []
      },
      items: items,
      scoring: { method: "sum_subitems", partial_credit: "per_subitem", negative_marking: false }
    };
  }

  function scoreLesson(lesson, basicAnswers, compositeAnswers) {
    basicAnswers = basicAnswers || {};
    compositeAnswers = compositeAnswers || {};
    var basicScore = 0;
    var basicDetails = [];
    (lesson.q || []).forEach(function (question, index) {
      var correct = isExactAnswer(basicAnswers[index], question.a);
      if (correct) basicScore += 1;
      basicDetails.push({ id: question.id, correct: correct, score: correct ? 1 : 0, max_score: 1 });
    });

    var composite = buildComposite(lesson);
    var compositeScore = 0;
    var compositeDetails = [];
    composite.items.forEach(function (item, index) {
      var answered = typeof compositeAnswers[index] === "boolean";
      var correct = answered && compositeAnswers[index] === item.answer;
      if (correct) compositeScore += 1;
      compositeDetails.push({ id: item.id, source_question_id: item.source_question_id, correct: correct, score: correct ? 1 : 0, max_score: 1 });
    });

    var total = (lesson.q || []).length + composite.items.length;
    return {
      score: basicScore + compositeScore,
      total: total,
      basic_score: basicScore,
      basic_total: (lesson.q || []).length,
      composite_score: compositeScore,
      composite_total: composite.items.length,
      basic_details: basicDetails,
      composite_details: compositeDetails
    };
  }

  function recordAttempt(previous, attempt) {
    previous = previous || {};
    var oldAttempts = Array.isArray(previous.attempts) ? previous.attempts.slice() : [];
    var oldCount = Number(previous.attempt_count) || (previous.date ? Math.max(1, oldAttempts.length) : 0);
    var oldBest = Math.max(Number(previous.best_score) || 0, Number(previous.score) || 0);
    var attempts = oldAttempts.concat([clone(attempt)]).slice(-20);
    var ratio = attempt.total > 0 ? attempt.score / attempt.total : 0;
    return Object.assign({}, previous, {
      date: previous.date || attempt.date,
      first_submitted_at: previous.first_submitted_at || attempt.submitted_at,
      latest_date: attempt.date,
      latest_submitted_at: attempt.submitted_at,
      attempt_count: oldCount + 1,
      score: attempt.score,
      total: attempt.total,
      latest_score: attempt.score,
      best_score: Math.max(oldBest, Number(attempt.score) || 0),
      passed: ratio >= 0.7,
      ever_passed: !!previous.ever_passed || ratio >= 0.7,
      attempts: attempts
    });
  }

  function addDays(date, count) {
    var d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + count);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function updateWeakQuestion(previous, correct, date, lessonDay, question) {
    previous = previous || {
      question_id: question.id,
      lesson_day: lessonDay,
      question: question.q,
      knowledge_ids: clone(question.knowledge_ids || []),
      wrong_count: 0,
      correct_streak: 0,
      resolved: false
    };
    if (correct) {
      if (previous.last_correct_at === date) return previous;
      previous.correct_streak = (previous.correct_streak || 0) + 1;
      previous.last_correct_at = date;
      previous.due_date = addDays(date, previous.correct_streak >= 3 ? 30 : (previous.correct_streak >= 2 ? 14 : 3));
      previous.resolved = previous.correct_streak >= 3;
    } else {
      previous.wrong_count = (previous.wrong_count || 0) + 1;
      previous.correct_streak = 0;
      previous.last_wrong_at = date;
      previous.due_date = addDays(date, 1);
      previous.resolved = false;
    }
    return previous;
  }

  var api = {
    isExactAnswer: isExactAnswer,
    buildComposite: buildComposite,
    scoreLesson: scoreLesson,
    recordAttempt: recordAttempt,
    updateWeakQuestion: updateWeakQuestion,
    addDays: addDays
  };
  root.TCMQuizEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
