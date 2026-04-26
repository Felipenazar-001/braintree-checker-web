import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, TrendingUp, AlertCircle, Upload, Settings, Copy, Check, Download } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useState, useEffect } from "react";
import { getExpectedReturns, isReturnLive, detectCardBrand } from "../../../shared/cardReturns";
import { playSuccessSound } from "@/lib/sounds";

const LOGO_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext x='50' y='50' font-size='40' font-weight='bold' text-anchor='middle' dy='.3em' fill='%23ffffff'%3ECC%3C/text%3E%3C/svg%3E";

const DEFAULT_PROXIES = [
  "103.146.185.57:8080",
  "103.152.104.228:8080",
  "103.145.45.97:8080",
  "103.152.112.145:8080",
  "103.145.45.98:8080",
];

interface CardCheckResult {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  status: string;
  classification: string;
  responseTime: number;
  error?: string;
  bank?: string | null;
  brand?: string;
  expectedReturns?: string[];
  actualReturn?: string;
  returnStatus?: string;
  paypalStatus?: string;
  paypalMessage?: string;
  paypalResponseTime?: number;
}

export default function CheckerBatch() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [cardsList, setCardsList] = useState("");
  const [proxy, setProxy] = useState("");
  const [proxyList, setProxyList] = useState<string[]>([]);
  const [proxyInput, setProxyInput] = useState("");
  const [validProxies, setValidProxies] = useState<string[]>([]);
  const [isValidatingProxies, setIsValidatingProxies] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<CardCheckResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [usePayPal, setUsePayPal] = useState(false);
  const [paypalResults, setPaypalResults] = useState<any[]>([]);
  const [paypalOrderId, setPaypalOrderId] = useState("5ST50483YA8267111");
  const [paypalInstallments, setPaypalInstallments] = useState(1);
  const [paypalDelay, setPaypalDelay] = useState(7);
  const [editingUsername, setEditingUsername] = useState("");
  const [editingRole, setEditingRole] = useState<"user" | "admin">("user");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCard = (card: CardCheckResult) => {
    const cardData = `${card.cardNumber}|${card.expiryMonth}|${card.expiryYear}|${card.cvv}`;
    navigator.clipboard.writeText(cardData).then(() => {
      toast.success("Cartão copiado para a área de transferência!");
      setCopiedIndex(Math.random());
      setTimeout(() => setCopiedIndex(null), 2000);
    }).catch(() => {
      toast.error("Erro ao copiar cartão");
    });
  };

  const handleExportResults = (format: 'csv' | 'txt', filterType: 'all' | 'live' | 'dead' | 'unk') => {
    let dataToExport = results;
    let filename = `resultados_${new Date().toISOString().split('T')[0]}`;

    if (filterType === 'live') {
      dataToExport = results.filter(r => r.classification === 'Live');
      filename = `cartoes_live_${new Date().toISOString().split('T')[0]}`;
    } else if (filterType === 'dead') {
      dataToExport = results.filter(r => r.classification === 'Dead');
      filename = `cartoes_dead_${new Date().toISOString().split('T')[0]}`;
    } else if (filterType === 'unk') {
      dataToExport = results.filter(r => r.classification === 'Unknown');
      filename = `cartoes_unk_${new Date().toISOString().split('T')[0]}`;
    }

    if (dataToExport.length === 0) {
      toast.error("Nenhum resultado para exportar");
      return;
    }

    let content = '';
    if (format === 'csv') {
      content = 'Cartão,Mês,Ano,CVV,Status,Classificação,Tempo(ms)\n';
      dataToExport.forEach(card => {
        content += `"${card.cardNumber}","${card.expiryMonth}","${card.expiryYear}","${card.cvv}","${card.status}","${card.classification}",${card.responseTime}\n`;
      });
      filename += '.csv';
    } else {
      content = `Resultados de Verificação de Cartões\n`;
      content += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
      content += `Total de Cartões: ${dataToExport.length}\n\n`;
      dataToExport.forEach((card, index) => {
        content += `${index + 1}. ${card.cardNumber}|${card.expiryMonth}|${card.expiryYear}|${card.cvv}\n`;
        content += `   Status: ${card.classification}\n`;
        content += `   Tempo: ${card.responseTime}ms\n\n`;
      });
      filename += '.txt';
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Arquivo ${filename} baixado com sucesso!`);
  };

  const validateProxies = async () => {
    if (!proxyInput.trim()) {
      toast.error("Insira proxies no formato IP:PORTA ou IP:PORTA:USER:PASS");
      return;
    }

    setIsValidatingProxies(true);
    const rawProxies = proxyInput
      .split("\n")
      .map(p => p.trim())
      .filter(p => p.length > 0);

    // Suporta IP:PORTA e IP:PORTA:USER:PASS
    const ipPortRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})(?::(.+):(.+))?$/;
    const validProxyList: string[] = [];
    const invalidProxies: string[] = [];

    rawProxies.forEach(proxy => {
      const match = proxy.match(ipPortRegex);
      if (match) {
        const port = parseInt(match[2]);
        if (port >= 1 && port <= 65535) {
          validProxyList.push(proxy);
        } else {
          invalidProxies.push(`${proxy} (porta invalida)`);
        }
      } else {
        invalidProxies.push(`${proxy} (formato invalido)`);
      }
    });

    setProxyList(rawProxies);
    setValidProxies(validProxyList);
    setIsValidatingProxies(false);

    if (invalidProxies.length > 0) {
      toast.warning(`${validProxyList.length} validos, ${invalidProxies.length} invalidos`);
    } else {
      toast.success(`${validProxyList.length} proxies carregados com sucesso!`);
    }
  };

  const handleAddProxies = () => {
    validateProxies();
  };

  const checkCardMutation = trpc.checker.checkCard.useMutation();
  const checkCardPayPalMutation = trpc.checker.checkCardPayPal.useMutation();
  const statsQuery = trpc.checker.getStats.useQuery();
  const historyQuery = trpc.checker.getHistory.useQuery({ limit: 50 });
  const createUserMutation = trpc.admin.createUser.useMutation();
  const listUsersQuery = trpc.admin.listUsers.useQuery(undefined, {
    enabled: showAdminPanel,
  });
  const updateUserMutation = trpc.admin.updateUser.useMutation();
  const deleteUserMutation = trpc.admin.deleteUser.useMutation();

  // Carregar proxies padrão na inicialização
  useEffect(() => {
    setProxyInput(DEFAULT_PROXIES.join("\n"));
    setValidProxies(DEFAULT_PROXIES);
  }, []);

  const parseCards = (input: string) => {
    return input
      .split("\n")
      .map((line) => {
        const parts = line.trim().split("|");
        if (parts.length === 4) {
          return {
            cardNumber: parts[0],
            expiryMonth: parts[1],
            expiryYear: parts[2],
            cvv: parts[3],
          };
        }
        return null;
      })
      .filter((card) => card !== null);
  };

  const handleProcessBatch = async () => {
    const cards = parseCards(cardsList);
    if (cards.length === 0) {
      toast.error("Nenhum cartão válido encontrado");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults([]); // Limpar resultados anteriores

    const batchResults: CardCheckResult[] = [];

    let stopProcessing = false;
    const stop = () => { stopProcessing = true; setIsProcessing(false); };

    for (let i = 0; i < cards.length; i++) {
      if (stopProcessing) break;
      const card = cards[i]!;
      try {
        let currentProxy = proxy;
        if (validProxies.length > 0) {
          currentProxy = validProxies[i % validProxies.length];
        }
        const result = await checkCardMutation.mutateAsync({
          cardNumber: card.cardNumber,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          cvv: card.cvv,
          proxy: currentProxy,
        });

        const expectedInfo = getExpectedReturns(card.cardNumber);
        const actualReturn = result.check.status?.substring(0, 2).toUpperCase() || "";
        const isLive = isReturnLive(card.cardNumber, actualReturn);

        let paypalData: any = {};
        if (usePayPal) {
          try {
            const paypalResult = await checkCardPayPalMutation.mutateAsync({
              cardNumber: card.cardNumber,
              expiryMonth: card.expiryMonth,
              expiryYear: card.expiryYear,
              cvv: card.cvv,
              proxy: currentProxy,
              orderId: paypalOrderId,
              installmentTerm: paypalInstallments,
            });
            paypalData = {
              paypalStatus: paypalResult.result.status,
              paypalMessage: paypalResult.result.message,
              paypalResponseTime: paypalResult.responseTime,
            };
          } catch (error) {
            paypalData = {
              paypalStatus: "ERROR",
              paypalMessage: String(error),
              paypalResponseTime: 0,
            };
          }
        }

        // Tocar som se for LIVE
        if (isLive) {
          playSuccessSound();
        }

        const newResult = {
          cardNumber: card.cardNumber,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          cvv: card.cvv,
          status: result.check.status,
          classification: result.check.classification || "Unknown",
          responseTime: result.check.responseTime || 0,
          bank: expectedInfo.bank,
          brand: expectedInfo.brand,
          expectedReturns: expectedInfo.expectedReturns,
          actualReturn: actualReturn,
          returnStatus: isLive ? "✓ LIVE" : "✗ DEAD",
          ...paypalData,
        };
        
        batchResults.push(newResult);
        // Atualizar tabela em tempo real
        setResults([...batchResults]);

        // Aplicar delay se necessário
        if (usePayPal && i < cards.length - 1) {
          await new Promise(resolve => setTimeout(resolve, paypalDelay * 1000));
        }
      } catch (error) {
        const errorResult = {
          cardNumber: card.cardNumber,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          cvv: card.cvv,
          status: "Erro",
          classification: "Error",
          responseTime: 0,
          error: String(error),
        };
        
        batchResults.push(errorResult);
        // Atualizar tabela em tempo real
        setResults([...batchResults]);
      }

      setProgress(Math.round(((i + 1) / cards.length) * 100));
    }

    setIsProcessing(false);
    toast.success(`Processamento concluído! ${batchResults.length} cartões verificados.`);
  };

  const stats = statsQuery.data;
  const approved = results.filter((r) => r.classification === "Live").length;
  const declined = results.filter((r) => r.classification === "Dead").length;
  const unknown = results.filter((r) => r.classification === "Unknown").length;
  const errors = results.filter((r) => r.classification === "Error").length;

  const chartData = [
    { name: "Aprovados", value: approved, fill: "oklch(0.5 0.2 120)" },
    { name: "Recusados", value: declined, fill: "oklch(0.577 0.245 27.325)" },
    { name: "Desconhecidos", value: unknown, fill: "oklch(0.967 0.001 286.375)" },
    { name: "Erros", value: errors, fill: "oklch(0.6 0.15 0)" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background logo */}
      <div
        className="absolute inset-0 opacity-5 bg-cover bg-center"
        style={{ backgroundImage: `url(${LOGO_URL})` }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-500 text-white py-6 sm:py-8 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2">ONE LEGEND</h1>
              <p className="text-sm sm:text-base text-purple-100">Braintree Checker Pro - Processamento em Lote</p>
            </div>
            {user?.role === 'admin' && (
              <Button
                onClick={() => setShowAdminPanel(true)}
                className="bg-white text-violet-600 hover:bg-purple-100 font-bold flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Administrador
              </Button>
            )}
          </div>
        </div>

        {/* Main Container */}
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-800 border-purple-500/30 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-300">Total Processado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-500">{results.length}</div>
                <p className="text-xs text-slate-400 mt-1">Cartões verificados</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-green-500/30 text-white cursor-pointer hover:border-green-500/60 transition-all" onClick={() => { setFilterType('Live'); setShowFilterModal(true); }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-300">Aprovados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">{approved}</div>
                <p className="text-xs text-slate-400 mt-1">Cartões válidos</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-red-500/30 text-white cursor-pointer hover:border-red-500/60 transition-all" onClick={() => { setFilterType('Dead'); setShowFilterModal(true); }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-300">Recusados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{declined}</div>
                <p className="text-xs text-slate-400 mt-1">Cartões inválidos</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-yellow-500/30 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-yellow-300">Progresso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">{progress}%</div>
                <p className="text-xs text-slate-400 mt-1">Processamento</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Form */}
            <div className="lg:col-span-1">
              <Card className="bg-slate-800 border-purple-500/30 text-white sticky top-8 h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-400">
                    <Upload className="w-5 h-5" />
                    Processamento em Lote
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Cole a lista de cartões (um por linha)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleProcessBatch();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">
                        Lista de Cartões
                      </label>
                      <textarea
                        placeholder="CARD|MM|YYYY|CVV&#10;4532015112830366|12|2025|123&#10;5425233010103442|06|2026|456"
                        value={cardsList}
                        onChange={(e) => setCardsList(e.target.value)}
                        disabled={isProcessing}
                        rows={8}
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 placeholder-slate-400 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">
                        Proxies (um por linha - IP:PORTA ou IP:PORTA:USER:PASS)
                      </label>
                      <textarea
                        placeholder="192.168.1.1:8080\n10.0.0.1:3128:user:pass\n172.16.0.1:9090"
                        value={proxyInput}
                        onChange={(e) => setProxyInput(e.target.value)}
                        disabled={isProcessing || isValidatingProxies}
                        rows={4}
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 placeholder-slate-400 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleAddProxies}
                      disabled={isProcessing || isValidatingProxies || !proxyInput.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      {isValidatingProxies ? "Validando..." : `Carregar Proxies (${validProxies.length})`}
                    </Button>

                    {validProxies.length > 0 && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                        <p className="text-xs text-green-400">
                          ✓ {validProxies.length} proxies carregados
                        </p>
                      </div>
                    )}

                    <div className="space-y-4 border-t border-slate-700 pt-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="usePayPal"
                          checked={usePayPal}
                          onChange={(e) => setUsePayPal(e.target.checked)}
                          disabled={isProcessing}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="usePayPal" className="text-sm font-medium text-slate-300 cursor-pointer">
                          Validar com PayPal
                        </label>
                      </div>

                      {usePayPal && (
                        <div className="space-y-3 pl-6 border-l-2 border-purple-500/30">
                          <div>
                            <label className="text-xs font-medium text-slate-400 mb-1 block">
                              PayPal Order ID / Token
                            </label>
                            <Input
                              value={paypalOrderId}
                              onChange={(e) => setPaypalOrderId(e.target.value)}
                              disabled={isProcessing}
                              className="h-8 text-xs bg-slate-700 border-slate-600"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium text-slate-400 mb-1 block">
                                Parcelas
                              </label>
                              <Input
                                type="number"
                                min={1}
                                max={12}
                                value={paypalInstallments}
                                onChange={(e) => setPaypalInstallments(parseInt(e.target.value))}
                                disabled={isProcessing}
                                className="h-8 text-xs bg-slate-700 border-slate-600"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-400 mb-1 block">
                                Delay (seg)
                              </label>
                              <Input
                                type="number"
                                min={1}
                                value={paypalDelay}
                                onChange={(e) => setPaypalDelay(parseInt(e.target.value))}
                                disabled={isProcessing}
                                className="h-8 text-xs bg-slate-700 border-slate-600"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={isProcessing || cardsList.trim().length === 0}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            Processar Lote
                          </>
                        )}
                      </Button>
                      {isProcessing && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => stop()}
                          className="px-4"
                        >
                          Parar
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-slate-700 border border-slate-600">
                  <TabsTrigger value="all" className="text-xs sm:text-sm">Todos ({results.length})</TabsTrigger>
                  <TabsTrigger value="live" className="text-xs sm:text-sm text-green-400">LIVE ({approved})</TabsTrigger>
                  <TabsTrigger value="dead" className="text-xs sm:text-sm text-red-400">DEAD ({declined})</TabsTrigger>
                  <TabsTrigger value="unk" className="text-xs sm:text-sm text-yellow-400">UNK ({unknown})</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <Card className="bg-slate-800 border-purple-500/30 text-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-purple-300">Todos os Cartões</CardTitle>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExportResults('csv', 'all')}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 hover:text-blue-200 transition-colors text-xs"
                          title="Exportar como CSV"
                        >
                          <Download className="w-4 h-4" />
                          CSV
                        </button>
                        <button
                          onClick={() => handleExportResults('txt', 'all')}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 hover:text-blue-200 transition-colors text-xs"
                          title="Exportar como TXT"
                        >
                          <Download className="w-4 h-4" />
                          TXT
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {results.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">Nenhum resultado ainda</p>
                      ) : (
                        <div className="overflow-x-auto max-h-96">
                          <table className="w-full text-sm">
                            <thead className="border-b border-slate-700 sticky top-0 bg-slate-800">
                              <tr>
                                <th className="py-2 px-4 text-left text-slate-300">Cartão</th>
                                <th className="py-2 px-4 text-left text-slate-300">Data</th>
                                <th className="py-2 px-4 text-left text-slate-300">CVV</th>
                                <th className="py-2 px-4 text-left text-slate-300">Banco</th>
                                <th className="py-2 px-4 text-left text-slate-300">Bandeira</th>
                                <th className="py-2 px-4 text-left text-slate-300">Retorno</th>
                                <th className="py-2 px-4 text-left text-slate-300">Esperado</th>
                                <th className="py-2 px-4 text-left text-slate-300">Status</th>
                                <th className="py-2 px-4 text-left text-slate-300">Tempo (ms)</th>
                                {usePayPal && <th className="py-2 px-4 text-left text-slate-300">PayPal</th>}
                                <th className="py-2 px-4 text-left text-slate-300">Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.map((r, idx) => (
                                <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                                  <td className="py-2 px-4 text-slate-200 font-mono text-xs">{r.cardNumber}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs font-mono">{r.expiryMonth}/{r.expiryYear}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs font-mono">{r.cvv}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs">{r.bank || "-"}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs capitalize">{r.brand || "-"}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs font-mono">{r.actualReturn || "-"}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs">{r.expectedReturns?.join(", ") || "-"}</td>
                                  <td className="py-2 px-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      r.returnStatus?.includes("LIVE") ? 'bg-green-500/20 text-green-300' :
                                      r.returnStatus?.includes("DEAD") ? 'bg-red-500/20 text-red-300' :
                                      'bg-gray-500/20 text-gray-300'
                                    }`}>{r.returnStatus || r.classification}</span>
                                  </td>
                                  <td className="py-2 px-4 text-slate-400">{r.responseTime}</td>
                                  {usePayPal && (
                                    <td className="py-2 px-4">
                                      <div className="text-xs">
                                        <p className={`font-medium ${
                                          r.paypalStatus === 'APPROVED' ? 'text-green-300' :
                                          r.paypalStatus === 'DECLINED' ? 'text-red-300' :
                                          'text-yellow-300'
                                        }`}>
                                          {r.paypalStatus || '-'}
                                        </p>
                                        <p className="text-slate-400 text-xs">{r.paypalMessage?.substring(0, 20) || '-'}</p>
                                      </div>
                                    </td>
                                  )}
                                  <td className="py-2 px-4">
                                    <button
                                      onClick={() => handleCopyCard(r)}
                                      className="inline-flex items-center gap-2 px-3 py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-purple-200 transition-colors text-xs"
                                      title="Copiar cartão"
                                    >
                                      <Copy className="w-4 h-4" />
                                      Copiar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="live">
                  <Card className="bg-slate-800 border-green-500/30 text-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-green-300">Cartões LIVE</CardTitle>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExportResults('csv', 'live')}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded bg-green-600/20 hover:bg-green-600/40 text-green-300 hover:text-green-200 transition-colors text-xs"
                          title="Exportar como CSV"
                        >
                          <Download className="w-4 h-4" />
                          CSV
                        </button>
                        <button
                          onClick={() => handleExportResults('txt', 'live')}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded bg-green-600/20 hover:bg-green-600/40 text-green-300 hover:text-green-200 transition-colors text-xs"
                          title="Exportar como TXT"
                        >
                          <Download className="w-4 h-4" />
                          TXT
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {results.filter(r => r.classification === 'Live').length === 0 ? (
                        <p className="text-slate-400 text-center py-8">Nenhum cartão LIVE</p>
                      ) : (
                        <div className="overflow-x-auto max-h-96">
                          <table className="w-full text-sm">
                            <thead className="border-b border-slate-700 sticky top-0 bg-slate-800">
                              <tr>
                                <th className="py-2 px-4 text-left text-slate-300">Cartão</th>
                                <th className="py-2 px-4 text-left text-slate-300">Data</th>
                                <th className="py-2 px-4 text-left text-slate-300">CVV</th>
                                <th className="py-2 px-4 text-left text-slate-300">Banco</th>
                                <th className="py-2 px-4 text-left text-slate-300">Bandeira</th>
                                <th className="py-2 px-4 text-left text-slate-300">Retorno</th>
                                <th className="py-2 px-4 text-left text-slate-300">Esperado</th>
                                <th className="py-2 px-4 text-left text-slate-300">Status</th>
                                <th className="py-2 px-4 text-left text-slate-300">Tempo (ms)</th>
                                {usePayPal && <th className="py-2 px-4 text-left text-slate-300">PayPal</th>}
                                <th className="py-2 px-4 text-left text-slate-300">Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.filter(r => r.classification === 'Live').map((r, idx) => (
                                <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                                  <td className="py-2 px-4 text-slate-200 font-mono text-xs">{r.cardNumber}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs font-mono">{r.expiryMonth}/{r.expiryYear}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs font-mono">{r.cvv}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs">{r.bank || "-"}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs capitalize">{r.brand || "-"}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs font-mono">{r.actualReturn || "-"}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs">{r.expectedReturns?.join(", ") || "-"}</td>
                                  <td className="py-2 px-4">
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300">{r.returnStatus || "Live"}</span>
                                  </td>
                                  <td className="py-2 px-4 text-slate-400">{r.responseTime}</td>
                                  <td className="py-2 px-4">
                                    <button
                                      onClick={() => handleCopyCard(r)}
                                      className="inline-flex items-center gap-2 px-3 py-1 rounded bg-green-600/20 hover:bg-green-600/40 text-green-300 hover:text-green-200 transition-colors text-xs"
                                      title="Copiar cartão"
                                    >
                                      <Copy className="w-4 h-4" />
                                      Copiar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="dead">
                  <Card className="bg-slate-800 border-red-500/30 text-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-red-300">Cartões DEAD</CardTitle>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExportResults('csv', 'dead')}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-600/20 hover:bg-red-600/40 text-red-300 hover:text-red-200 transition-colors text-xs"
                          title="Exportar como CSV"
                        >
                          <Download className="w-4 h-4" />
                          CSV
                        </button>
                        <button
                          onClick={() => handleExportResults('txt', 'dead')}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-600/20 hover:bg-red-600/40 text-red-300 hover:text-red-200 transition-colors text-xs"
                          title="Exportar como TXT"
                        >
                          <Download className="w-4 h-4" />
                          TXT
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {results.filter(r => r.classification === 'Dead').length === 0 ? (
                        <p className="text-slate-400 text-center py-8">Nenhum cartão DEAD</p>
                      ) : (
                        <div className="overflow-x-auto max-h-96">
                          <table className="w-full text-sm">
                            <thead className="border-b border-slate-700 sticky top-0 bg-slate-800">
                              <tr>
                                <th className="py-2 px-4 text-left text-slate-300">Cartão</th>
                                <th className="py-2 px-4 text-left text-slate-300">Data</th>
                                <th className="py-2 px-4 text-left text-slate-300">CVV</th>
                                <th className="py-2 px-4 text-left text-slate-300">Banco</th>
                                <th className="py-2 px-4 text-left text-slate-300">Bandeira</th>
                                <th className="py-2 px-4 text-left text-slate-300">Retorno</th>
                                <th className="py-2 px-4 text-left text-slate-300">Esperado</th>
                                <th className="py-2 px-4 text-left text-slate-300">Status</th>
                                <th className="py-2 px-4 text-left text-slate-300">Tempo (ms)</th>
                                {usePayPal && <th className="py-2 px-4 text-left text-slate-300">PayPal</th>}
                                <th className="py-2 px-4 text-left text-slate-300">Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.filter(r => r.classification === 'Dead').map((r, idx) => (
                                <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                                  <td className="py-2 px-4 text-slate-200 font-mono text-xs">{r.cardNumber}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs font-mono">{r.expiryMonth}/{r.expiryYear}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs font-mono">{r.cvv}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs">{r.bank || "-"}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs capitalize">{r.brand || "-"}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs font-mono">{r.actualReturn || "-"}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs">{r.expectedReturns?.join(", ") || "-"}</td>
                                  <td className="py-2 px-4">
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300">{r.returnStatus || "Dead"}</span>
                                  </td>
                                  <td className="py-2 px-4 text-slate-400">{r.responseTime}</td>
                                  <td className="py-2 px-4">
                                    <button
                                      onClick={() => handleCopyCard(r)}
                                      className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-600/20 hover:bg-red-600/40 text-red-300 hover:text-red-200 transition-colors text-xs"
                                      title="Copiar cartão"
                                    >
                                      <Copy className="w-4 h-4" />
                                      Copiar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="unk">
                  <Card className="bg-slate-800 border-yellow-500/30 text-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-yellow-300">Cartões UNK</CardTitle>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExportResults('csv', 'unk')}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 hover:text-yellow-200 transition-colors text-xs"
                          title="Exportar como CSV"
                        >
                          <Download className="w-4 h-4" />
                          CSV
                        </button>
                        <button
                          onClick={() => handleExportResults('txt', 'unk')}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 hover:text-yellow-200 transition-colors text-xs"
                          title="Exportar como TXT"
                        >
                          <Download className="w-4 h-4" />
                          TXT
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {results.filter(r => r.classification === 'Unknown').length === 0 ? (
                        <p className="text-slate-400 text-center py-8">Nenhum cartão UNK</p>
                      ) : (
                        <div className="overflow-x-auto max-h-96">
                          <table className="w-full text-sm">
                            <thead className="border-b border-slate-700 sticky top-0 bg-slate-800">
                              <tr>
                                <th className="py-2 px-4 text-left text-slate-300">Cartão</th>
                                <th className="py-2 px-4 text-left text-slate-300">Data</th>
                                <th className="py-2 px-4 text-left text-slate-300">CVV</th>
                                <th className="py-2 px-4 text-left text-slate-300">Banco</th>
                                <th className="py-2 px-4 text-left text-slate-300">Bandeira</th>
                                <th className="py-2 px-4 text-left text-slate-300">Retorno</th>
                                <th className="py-2 px-4 text-left text-slate-300">Esperado</th>
                                <th className="py-2 px-4 text-left text-slate-300">Status</th>
                                <th className="py-2 px-4 text-left text-slate-300">Tempo (ms)</th>
                                {usePayPal && <th className="py-2 px-4 text-left text-slate-300">PayPal</th>}
                                <th className="py-2 px-4 text-left text-slate-300">Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.filter(r => r.classification === 'Unknown').map((r, idx) => (
                                <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                                  <td className="py-2 px-4 text-slate-200 font-mono text-xs">{r.cardNumber}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs font-mono">{r.expiryMonth}/{r.expiryYear}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs font-mono">{r.cvv}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs">{r.bank || "-"}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs capitalize">{r.brand || "-"}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs font-mono">{r.actualReturn || "-"}</td>
                                  <td className="py-2 px-4 text-slate-300 text-xs">{r.expectedReturns?.join(", ") || "-"}</td>
                                  <td className="py-2 px-4">
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300">{r.returnStatus || "Unknown"}</span>
                                  </td>
                                  <td className="py-2 px-4 text-slate-400">{r.responseTime}</td>
                                  <td className="py-2 px-4">
                                    <button
                                      onClick={() => handleCopyCard(r)}
                                      className="inline-flex items-center gap-2 px-3 py-1 rounded bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 hover:text-yellow-200 transition-colors text-xs"
                                      title="Copiar cartão"
                                    >
                                      <Copy className="w-4 h-4" />
                                      Copiar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Admin Panel Dialog */}
          {showAdminPanel && (
            <Dialog open={showAdminPanel} onOpenChange={setShowAdminPanel}>
              <DialogContent className="bg-slate-800 border-purple-500/30 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-purple-300">Painel Administrativo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">
                      Criar Novo Usuário
                    </label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      <Input
                        placeholder="Senha"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      <Input
                        placeholder="Nome"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      <Button
                        onClick={() => {
                          if (newUsername && newPassword && newName) {
                            createUserMutation.mutate({
                              username: newUsername,
                              password: newPassword,
                              name: newName,
                            });
                            setNewUsername("");
                            setNewPassword("");
                            setNewName("");
                          }
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        Criar Usuário
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">
                      Usuários
                    </label>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {listUsersQuery.data?.map((user: any) => (
                        <div key={user.id} className="bg-slate-700 p-3 rounded flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-slate-400">{user.username} - {user.role}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setEditingUserId(user.id);
                                setEditingUsername(user.username);
                                setEditingRole(user.role);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-xs"
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja deletar este usuário?")) {
                                  deleteUserMutation.mutate({ id: user.id });
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-xs"
                            >
                              Deletar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {editingUserId && (
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">
                        Editar Usuário
                      </label>
                      <div className="space-y-2">
                        <Input
                          placeholder="Username"
                          value={editingUsername}
                          onChange={(e) => setEditingUsername(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value as "user" | "admin")}
                          className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button
                          onClick={() => {
                            updateUserMutation.mutate({
                              id: editingUserId,
                              name: editingUsername,
                              role: editingRole,
                            });
                            setEditingUserId(null);
                          }}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          Salvar Alterações
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}
