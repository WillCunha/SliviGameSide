type SliviPulseResult = {
  score: number;
  duration: number;
  finalEmotionValue: number;
  finalEmotionState: string;
};

export async function sendGameResult(data: SliviPulseResult) {
  return fetch('/slivi/pulse/result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
