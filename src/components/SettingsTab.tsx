import { useState, FormEvent } from 'react';
import { Save, HardDrive, Key, RefreshCcw, BellRing, HelpCircle } from 'lucide-react';

export default function SettingsTab() {
  const [sensorMultiplier, setSensorMultiplier] = useState<number>(1.2);
  const [autoResolve, setAutoResolve] = useState<boolean>(true);
  const [securityScan, setSecurityScan] = useState<boolean>(true);
  const [webhookUrl, setWebhookUrl] = useState<string>('https://webhook.urbanpulse.gov/v1/dispatch');

  const handleSaveSettings = (e: FormEvent) => {
    e.preventDefault();
    alert('As configurações do Super Administrador foram persistidas e enviadas para o gateway central com sucesso!');
  };

  return (
    <div id="settings-view-terminal" className="space-y-6 animate-in fade-in duration-300 font-sans">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-surface mb-1">Configuração Central</h2>
        <p className="text-base text-on-surface-variant">Definições globais de telemetria base, webhooks de despacho e limites de segurança</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form Column */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-8 space-y-6 text-xs">
          <div className="bg-surface-container border border-outline-variant p-6 rounded-2xl space-y-8">
            
            {/* Base Telemetry Simulation Factors */}
            <div>
              <h3 className="font-bold text-on-surface text-base mb-1.5 flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                <span>Base de Telemetria IoT</span>
              </h3>
              <p className="text-xs text-on-surface-variant mb-6">Multiplicador global aplicado às frequências de despacho de ocorrências em todos os municípios cadastrados.</p>
              
              <div className="space-y-4 font-sans">
                <div>
                  <label className="flex justify-between text-xs font-semibold text-on-surface mb-2">
                    <span>Multiplicador de Sensibilidade</span>
                    <span className="text-primary font-bold">{sensorMultiplier}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={sensorMultiplier}
                    onChange={(e) => setSensorMultiplier(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary focus:outline-none"
                  />
                  <div className="flex justify-between text-[11px] text-on-surface-variant font-medium mt-2">
                    <span>0.5x (Baixa Carga)</span>
                    <span>1.5x (Normal)</span>
                    <span>3.0x (Stress Físico)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-outline-variant"></div>

            {/* Automation parameters */}
            <div>
              <h3 className="font-bold text-on-surface text-base mb-4 flex items-center gap-2">
                <BellRing className="h-5 w-5 text-primary" />
                <span>Automação de Despacho</span>
              </h3>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoResolve}
                    onChange={(e) => setAutoResolve(e.target.checked)}
                    className="mt-1 border-outline-variant bg-surface text-primary rounded focus:ring-primary h-4.2 w-4.2 cursor-pointer"
                  />
                  <div>
                    <p className="font-semibold text-on-surface text-sm">Auto-Despachar Ocorrências de Baixo Risco</p>
                    <p className="text-xs text-on-surface-variant mt-1 leading-normal">Mover incidentes acústicos ou de saneamento menores automaticamente para o estado "Em Resolução".</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={securityScan}
                    onChange={(e) => setSecurityScan(e.target.checked)}
                    className="mt-1 border-outline-variant bg-surface text-primary rounded focus:ring-primary h-4.2 w-4.2 cursor-pointer"
                  />
                  <div>
                    <p className="font-semibold text-on-surface text-sm">Criptografia de Comunicação TLS End-to-End</p>
                    <p className="text-xs text-on-surface-variant mt-1 leading-normal">Exigir autenticação baseada em chave de ponta para todos os transmissores locais.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="border-t border-outline-variant"></div>

            {/* Decript parameters for Webhook */}
            <div>
              <h3 className="font-bold text-on-surface text-base mb-1.5 flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <span>Integração de Webhook</span>
              </h3>
              <p className="text-xs text-on-surface-variant mb-4">Servidor central para espelhamento JSON de logs de incidentes em tempo real.</p>
              
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://sua-empresa.com/endpoints/logs"
                className="w-full px-3 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary text-on-surface rounded-lg text-sm transition-all"
              />
            </div>
            
            <div className="flex justify-end pt-3 text-right">
              <button
                type="submit"
                className="bg-primary hover:opacity-90 border border-transparent text-on-primary font-bold text-xs px-6 py-2.5 rounded-lg cursor-pointer flex items-center gap-2 shadow-md"
              >
                <Save className="h-4.5 w-4.5" />
                <span>Salvar Definições</span>
              </button>
            </div>
          </div>
        </form>

        {/* Diagnostic Metadata Sidebar Info (Spans 4 cols) */}
        <div className="lg:col-span-4 space-y-6 text-xs">
          <div className="bg-surface-container border border-outline-variant p-6 rounded-2xl space-y-6">
            <h3 className="font-bold text-on-surface text-base border-b border-outline-variant pb-3">Status de Ligação</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-surface-container-high p-3 rounded-lg border border-outline-variant text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
                  <span className="font-semibold text-on-surface">Gateway API</span>
                </div>
                <span className="font-bold text-secondary">
                  ONLINE
                </span>
              </div>

              <div className="flex justify-between items-center bg-surface-container-high p-3 rounded-lg border border-outline-variant text-xs">
                <div className="flex items-center gap-2 bg-transparent">
                  <RefreshCcw className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold text-on-surface">Cluster IoT</span>
                </div>
                <span className="font-bold text-on-surface">
                  99% DISP.
                </span>
              </div>
            </div>

            <div className="bg-surface-container-high p-4 rounded-xl border border-outline-variant text-xs text-on-surface-variant leading-relaxed">
              <p className="font-bold text-on-surface pb-1.5 flex items-center gap-1.5 border-b border-outline-variant mb-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span>Modo Sandbox</span>
              </p>
              As bases de dados locais e chaves seguras são simuladas e mantidas no navegador para teste integral em ambiente de desenvolvimento.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
