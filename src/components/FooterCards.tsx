import { useState, useEffect, useRef } from 'react';
import { Download, Terminal, ArrowRight, Play, Pause, RefreshCw } from 'lucide-react';

export default function FooterCards() {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [showLogsConsole, setShowLogsConsole] = useState(false);
  const [logsList, setLogsList] = useState<string[]>([]);
  const [isLoggingActive, setIsLoggingActive] = useState(true);
  const [averageLatency, setAverageLatency] = useState(24);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Download compilation simulator
  const handleDownloadReport = () => {
    if (downloadProgress !== null) return;
    setDownloadProgress(0);
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev === null) {
          clearInterval(interval);
          return null;
        }
        if (prev >= 100) {
          clearInterval(interval);
          const mockData = `URBANPULSE SYSTEMS INTEGRATION REPORT - Q3\n` + 
                           `==========================================\n` + 
                           `Data compilada em: ${new Date().toLocaleDateString()}\n` +
                           `Média Global de Latência dos Sensores IoT: 24ms\n` +
                           `Taxa de Resolução de Ocorrências: 94.2%\n` +
                           `Redução média de tempos de trânsito em resposta médica: 40%\n` +
                           `Sistemas ativos da rede super-admin: Operacionais (Uptime: 99.98%)\n`;
          
          const blob = new Blob([mockData], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `UrbanPulse_Relatorio_Impacto_Q3.txt`;
          link.click();
          URL.revokeObjectURL(url);
          
          setTimeout(() => setDownloadProgress(null), 1000);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // Telemetry logs sequence generator
  useEffect(() => {
    // Generate initial logs
    const initialLogs = [
      `[INFO] [08:52:12] UrbanPulse Core Engine boot sequence completed successfully.`,
      `[MQTT] [08:52:15] Coletor de tráfego central #4029-LIS estabeleceu ligação.`,
      `[DB-S] [08:55:01] Sincronização multi-tenant das autarquias executada em 4.2ms.`,
      `[INFO] [09:02:44] Métrica consolidada: MRR registou €342k globais ativas.`,
      `[WARN] [09:12:11] Sensor de poluição Coimbra #9912-COI reportou calibração pendente.`,
    ];
    setLogsList(initialLogs);
  }, []);

  // Telemetry logs runner
  useEffect(() => {
    if (!isLoggingActive) return;

    const logPrefixes = ['[INFO]', '[MQTT]', '[DB-S]', '[API-REQ]', '[SEC]'];
    const logMessages = [
      'Análise de ocorrência prioritária efetuada com sucesso.',
      'Sincronização geográfica finalizada para Porto admin.',
      'Requisição GET /api/v1/municipalities processada por admin_local.',
      'Recalculando matrix de calor geo-espacial para Braga.',
      'Sensor acústico detetou fluxo anormal em artéria principal.',
      'Varredura de firewall concluída. 0 ameaças identificadas.',
      'Atribuição de plano Enterprise autorizada com sucesso.',
    ];

    const elapsed = setInterval(() => {
      const randomPrefix = logPrefixes[Math.floor(Math.random() * logPrefixes.length)];
      const randomMessage = logMessages[Math.floor(Math.random() * logMessages.length)];
      const currentTime = new Date().toLocaleTimeString('pt-PT');
      
      setLogsList((prev) => {
        const updated = [...prev, `${randomPrefix} [${currentTime}] ${randomMessage}`];
        return updated.slice(-40);
      });

      setAverageLatency((prev) => {
        const next = prev + (Math.random() > 0.5 ? 1 : -1);
        return Math.max(18, Math.min(29, next));
      });

    }, 3000);

    return () => clearInterval(elapsed);
  }, [isLoggingActive]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logsList]);

  return (
    <div id="footer-spotlights-row" className="grid grid-cols-1 md:grid-cols-2 gap-6 my-10 relative">
      {/* 1. Impact Report Q3 with Google Asset image background */}
      <div 
        id="spotlight-card-q3"
        className="relative rounded-2xl overflow-hidden h-48 group border border-outline-variant bg-slate-100"
      >
        <img 
          alt="A futuristic urban skyline seen through a clean glass window, representing modern municipal management."
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbx0M4ptuC-SRKjfj67C52Afp0odDVybs8BX0vG0TASNrsQ7U_cLf563rSqA3q1VTolHJyOGgpMpBUq2TcSXKpcKAiDZcVu85_rX1dq8StOjYZT7c6XhBYknUJBpPgGackPwBE8DYN92xh_AhoqUh6w0if2SW5joXFpwiGazRnS7GnmdNt5ZeNBn6kPpwWA2W5jsVzaxPoONsgNEA4FkE5pdBD3I6sSu1rHOz80j73kS2RxZL7BMiNV-YqUkUfCNroVO3EkcAwbAzg"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-transparent p-6 flex flex-col justify-center">
          <h5 className="text-xl font-bold text-on-primary mb-1">Relatório de Impacto Q3</h5>
          <p className="text-xs text-on-primary-container/80 max-w-xs mb-4 leading-relaxed">
            Veja como a plataforma reduziu o tempo de resposta em 40%.
          </p>
          <button 
            id="btn-download-q3-pdf"
            onClick={handleDownloadReport}
            className="relative w-fit bg-white text-primary font-bold text-xs px-4 py-2 rounded-lg hover:bg-on-primary-container hover:text-white transition-colors cursor-pointer flex items-center gap-2 overflow-hidden border-none shadow-sm"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span>{downloadProgress === null ? 'Download PDF' : `Exportando ${downloadProgress}%`}</span>
            {downloadProgress !== null && (
              <div 
                className="absolute bottom-0 left-0 h-[3px] bg-primary transition-all duration-150" 
                style={{ width: `${downloadProgress}%` }}
              ></div>
            )}
          </button>
        </div>
      </div>

      {/* 2. High-Tech Server Status Operational Card */}
      <div 
        id="spotlight-card-server-status"
        className="glass-card rounded-2xl p-6 flex flex-col justify-between border-t-4 border-secondary hover:scale-[1.01] transition-transform duration-150"
      >
        <div>
          <h5 className="text-xl font-bold text-on-surface mb-1">Status do Servidor Global</h5>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-secondary animate-pulse"></div>
            <p className="text-xs text-secondary font-bold uppercase tracking-wider">Sistemas Operacionais</p>
          </div>
        </div>

        <div className="flex justify-between items-end gap-4 mt-4">
          <div className="space-y-1 text-xs">
            <p className="text-on-surface-variant">
              Latência Média: <span className="text-on-surface font-bold pl-1">{averageLatency}ms</span>
            </p>
            <p className="text-on-surface-variant">
              Uptime (30d): <span className="text-on-surface font-bold pl-1">99.98%</span>
            </p>
          </div>
          
          <button 
            id="ver-logs-panel-trigger"
            onClick={() => setShowLogsConsole(!showLogsConsole)}
            className="text-primary text-xs font-semibold flex items-center gap-1 hover:underline cursor-pointer border-none bg-transparent"
          >
            <span>{showLogsConsole ? 'Ocultar Terminal' : 'Ver Logs'}</span>
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Sliding Operational Terminal Panel Drawer */}
      {showLogsConsole && (
        <div 
          id="logs-terminal-drawer"
          className="col-span-1 md:col-span-2 bg-on-background border border-outline-variant p-5 shadow-2xl rounded-xl mt-2 animate-in slide-in-from-bottom-3 duration-300"
        >
          <div className="flex justify-between items-center pb-3 border-b border-outline-variant mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4.2 w-4.2 text-on-primary animate-pulse" />
              <span className="text-xs font-mono font-bold text-on-primary tracking-wider">CONSOLE DE TELEMETRIA URBANPULSE</span>
              <span className="text-[10px] font-mono bg-primary text-on-primary px-2 py-0.5 rounded">LIVE</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsLoggingActive(!isLoggingActive)}
                className="p-1 hover:bg-white/10 text-on-primary/80 hover:text-on-primary transition-colors cursor-pointer text-xs font-mono flex items-center gap-1 border-none bg-transparent"
                title={isLoggingActive ? 'Pausar Logs' : 'Ativar Logs'}
              >
                {isLoggingActive ? (
                  <>
                    <Pause className="h-3 w-3 text-tertiary" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 text-secondary" />
                    <span>Iniciar</span>
                  </>
                )}
              </button>
              <button 
                onClick={() => setLogsList([])}
                className="p-1 hover:bg-white/10 text-on-primary/80 hover:text-on-primary transition-colors cursor-pointer text-xs font-mono flex items-center gap-1 border-none bg-transparent"
                title="Limpar consola"
              >
                <RefreshCw className="h-3 w-3 text-on-primary/50" />
                <span>Limpar</span>
              </button>
            </div>
          </div>
          
          <div 
            ref={scrollRef}
            className="h-44 overflow-y-auto font-mono text-xs text-on-primary/80 space-y-1.5 pr-2"
          >
            {logsList.length > 0 ? (
              logsList.map((log, index) => {
                let colorClass = 'text-on-primary/80';
                if (log.includes('[WARN]')) colorClass = 'text-tertiary-fixed-dim font-semibold';
                if (log.includes('[SEC]')) colorClass = 'text-error-container font-semibold';
                if (log.includes('[MQTT]')) colorClass = 'text-secondary-fixed font-semibold';
                if (log.includes('[DB-S]')) colorClass = 'text-secondary font-semibold';
                
                return (
                  <p key={index} className={colorClass}>
                    {log}
                  </p>
                );
              })
            ) : (
              <p className="text-on-primary/30 text-center py-10 italic">Consola de telemetria vazia. Aguardando sinal...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
