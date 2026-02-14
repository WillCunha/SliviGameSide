type SliviPulseResult = {
  game: string;
  score: number;
  duration: number;
  finalEmotionValue: number;
  finalEmotionState: string;
};

export async function sendGameScore(data: SliviPulseResult) {
  return fetch('/slivi/game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
