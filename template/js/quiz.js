/* 测验：即时反馈、计分、重置 */
IS.renderQuiz = function () {
  const section = $('#quiz');
  const root = $('#quizRoot');
  const quiz = IS.T.quiz || [];
  if (!quiz.length) {
    if (section) section.remove();
    return;
  }

  root.innerHTML = '';
  let answered = 0;
  let correct = 0;

  const score = el('div', 'quiz-score');
  score.setAttribute('aria-live', 'polite');
  score.innerHTML = `<span>已答 <strong>0</strong> / ${quiz.length}</span>` +
    `<span>正确 <strong>0</strong></span>` +
    '<button class="quiz-reset" type="button">重新作答</button>';
  root.appendChild(score);

  const answeredEl = score.querySelector('span:nth-child(1) strong');
  const correctEl = score.querySelector('span:nth-child(2) strong');
  const cards = [];

  function updateScore() {
    answeredEl.textContent = answered;
    correctEl.textContent = correct;
  }

  quiz.forEach((item, questionIndex) => {
    const card = el('div', 'quiz-card');
    card.dataset.answered = '0';
    const options = item.options || [];
    card.innerHTML = `<p class="quiz-q">${questionIndex + 1}. ${esc(item.question || '')}</p>` +
      `<div class="quiz-options">${options.map((option, optionIndex) =>
        `<button class="quiz-option" type="button" data-option="${optionIndex}">` +
        `<span class="key">${String.fromCharCode(65 + optionIndex)}</span><span>${esc(option)}</span></button>`
      ).join('')}</div>` +
      '<div class="quiz-explanation" hidden></div>';

    const explanation = card.querySelector('.quiz-explanation');
    const buttons = $$('.quiz-option', card);
    const correctIndex = Number(item.answer);

    buttons.forEach((button, optionIndex) => {
      button.addEventListener('click', () => {
        if (card.dataset.answered === '1') return;
        card.dataset.answered = '1';
        answered += 1;
        const isCorrect = optionIndex === correctIndex;
        if (isCorrect) correct += 1;

        buttons.forEach((optionButton, i) => {
          optionButton.disabled = true;
          if (i === correctIndex) optionButton.classList.add('correct');
          else if (i === optionIndex) optionButton.classList.add('wrong');
        });

        const verdict = isCorrect
          ? '<strong>回答正确。</strong>'
          : `<strong>回答错误。</strong> 正确答案是 ${String.fromCharCode(65 + correctIndex)}。`;
        explanation.innerHTML = `${verdict} ${item.explanation ? raw(item.explanation) : ''}`;
        explanation.hidden = false;
        updateScore();
      });
    });

    cards.push(card);
    root.appendChild(card);
  });

  score.querySelector('.quiz-reset').addEventListener('click', () => {
    answered = 0;
    correct = 0;
    updateScore();
    cards.forEach(card => {
      card.dataset.answered = '0';
      $$('.quiz-option', card).forEach(button => {
        button.disabled = false;
        button.classList.remove('correct', 'wrong');
      });
      const explanation = $('.quiz-explanation', card);
      explanation.hidden = true;
      explanation.innerHTML = '';
    });
  });
};
