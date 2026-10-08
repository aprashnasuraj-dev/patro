/** Diff complete final-result snapshots, including Android's cumulative index 0. */
export class VoiceResultDiff {
  private committed: string[] = [];
  private previous: string[] = [];
  private firstInSession = true;

  restart() { this.previous = []; this.firstInSession = true; }
  final(results: ArrayLike<{ isFinal: boolean; [index: number]: { transcript: string } }>): string {
    const words: string[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].isFinal) words.push(...String(results[i][0]?.transcript || '').trim().split(/\s+/).filter(Boolean));
    }
    if (!words.length) return '';
    let skip = 0;
    // Within a session a result is a snapshot: never commit the same prefix twice.
    while (skip < words.length && skip < this.previous.length && words[skip] === this.previous[skip]) skip++;
    if (skip < this.previous.length) {
      // A final result was revised. onFinal is append-only, so retain what the
      // user already received and append only beyond the prior snapshot length.
      skip = Math.min(words.length, this.previous.length);
    }
    if (this.firstInSession && this.committed.length) {
      // Some Android engines replay the previous final after restarting.
      for (let overlap = Math.min(words.length, this.committed.length); overlap > 0; overlap--) {
        if (words.slice(0, overlap).every((word, i) => word === this.committed[this.committed.length - overlap + i])) { skip = Math.max(skip, overlap); break; }
      }
    }
    this.firstInSession = false; this.previous = words;
    const delta = words.slice(skip); this.committed.push(...delta);
    return delta.join(' ');
  }
}
