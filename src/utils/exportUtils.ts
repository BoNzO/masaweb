import type { MasaPlan } from '../types/masaniello';


export const generateCSV = (plan: MasaPlan): string => {
    const headers = [
        'ID Evento',
        'Data/Ora',
        'Tipo',
        'Messaggio',
        'Quota',
        'Stake',
        'Esito',
        'Capitale Dopo',
        'Vittorie Rimaste',
        'Eventi Rimasti',
        'Config: Cap. Iniziale',
        'Config: Target %',
        'Config: Stop Loss %',
        'Snapshot: Consecutive Losses',
        'Snapshot: Rescued',
        'Snapshot: Active Rules'
    ].join(',');

    const rows = plan.events.map(event => {
        const type = event.isSystemLog ? 'SISTEMA' : 'EVENTO';
        const result = event.isVoid ? 'VOID' : event.isWin ? 'WIN' : 'LOSS';

        // Snapshot data if available
        const snapshot = event.snapshot;
        const configInitialCap = snapshot?.config.initialCapital ?? '-';
        const configTargetPerc = snapshot?.config.weeklyTargetPercentage ?? '-';
        const configStopLoss = snapshot?.config.stopLossPercentage ?? '-';
        const snapCL = snapshot?.currentConsecutiveLosses ?? '-';
        const snapRescued = snapshot?.isRescued ? 'SI' : 'NO';
        const snapRules = snapshot?.activeRules.join('|') ?? '-';

        return [
            event.id,
            event.timestamp,
            type,
            `"${event.message || ''}"`, // Quote message to handle commas
            event.quota ?? '-',
            event.stake.toFixed(2),
            result,
            event.capitalAfter.toFixed(2),
            event.winsLeft,
            event.eventsLeft,
            configInitialCap,
            configTargetPerc,
            configStopLoss,
            snapCL,
            snapRescued,
            `"${snapRules}"`
        ].join(',');
    });

    return [headers, ...rows].join('\n');
};

export const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
