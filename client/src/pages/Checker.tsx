import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap, TrendingUp, AlertCircle } from "lucide-react";
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663390191466/iBKAWjX8tWqzHTj4SwcNCQ/IMG_5722_9f2f7c0c.png";

export default function Checker() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [proxy, setProxy] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const checkCardMutation = trpc.checker.checkCard.useMutation();
  const statsQuery = trpc.checker.getStats.useQuery();
  const historyQuery = trpc.checker.getHistory.useQuery({ limit: 10 });

  const validateCard = () => {
    const errors: string[] = [];
    
    if (!cardNumber) errors.push("Número do cartão é obrigatório");
    else if (cardNumber.length < 13) errors.push("Número do cartão deve ter no mínimo 13 dígitos");
    else if (cardNumber.length > 19) errors.push("Número do cartão não pode ter mais de 19 dígitos");
    
    if (!expiryMonth) errors.push("Mês de expiração é obrigatório");
    else if (parseInt(expiryMonth) < 1 || parseInt(expiryMonth) > 12) errors.push("Mês deve estar entre 01 e 12");
    
    if (!expiryYear) errors.push("Ano de expiração é obrigatório");
    else if (expiryYear.length < 2) errors.push("Ano deve ter no mínimo 2 dígitos");
    
    if (!cvv) errors.push("CVV é obrigatório");
    else if (cvv.length < 3 || cvv.length > 4) errors.push("CVV deve ter 3 ou 4 dígitos");
    
    return errors;
  };

  const handleCheckCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateCard();
    if (errors.length > 0) {
      alert(errors.join("\n"));
      return;
    }

    setIsLoading(true);
    try {
      await checkCardMutation.mutateAsync({
        cardNumber,
        expiryMonth,
        expiryYear,
        cvv,
        proxy,
      });
      setCardNumber("");
      setExpiryMonth("");
      setExpiryYear("");
      setCvv("");
      setProxy("");
      statsQuery.refetch();
      historyQuery.refetch();
    } catch (error) {
      console.error("Erro ao verificar cartão:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = statsQuery.data;
  const history = historyQuery.data || [];

  const chartData = [
    {
      name: "Aprovados",
      value: stats?.approvedCount || 0,
      fill: "oklch(0.6 0.2 45)",
    },
    {
      name: "Recusados",
      value: stats?.declinedCount || 0,
      fill: "oklch(0.577 0.245 27.325)",
    },
    {
      name: "Desconhecidos",
      value: stats?.unknownCount || 0,
      fill: "oklch(0.967 0.001 286.375)",
    },
  ];

  const timelineData = history.map((check: any, idx: number) => ({
    time: new Date(check.createdAt).toLocaleTimeString("pt-BR"),
    responseTime: check.responseTime,
    cardType: check.cardType,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background logo com opacidade */}
      <div
        className="absolute inset-0 opacity-5 bg-cover bg-center"
        style={{ backgroundImage: `url(${LOGO_URL})` }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white py-6 sm:py-8 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-4xl font-bold mb-2">ONE LEGEND</h1>
            <p className="text-sm sm:text-base text-orange-100">Braintree Checker Pro - Verificação em Tempo Real</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-800 border-orange-500/30 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-orange-300">Total de Verificações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500">{stats?.totalChecks || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Todas as verificações</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-green-500/30 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-300">Aprovados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">{stats?.approvedCount || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Cartões válidos</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-red-500/30 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-300">Recusados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{stats?.declinedCount || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Cartões inválidos</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-yellow-500/30 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-yellow-300">Tempo Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">{stats?.averageResponseTime || 0}ms</div>
                <p className="text-xs text-slate-400 mt-1">Por verificação</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checker Form */}
            <div className="lg:col-span-1">
                  <Card className="bg-slate-800 border-orange-500/30 text-white sticky top-8 h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-400">
                    <Zap className="w-5 h-5" />
                    Verificador de Cartão
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Insira os dados do cartão para verificar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCheckCard} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">Número do Cartão</label>
                      <Input
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))}
                        disabled={isLoading}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">Mês</label>
                        <Input
                          placeholder="MM"
                          value={expiryMonth}
                          onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                          disabled={isLoading}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">Ano</label>
                        <Input
                          placeholder="YYYY"
                          value={expiryYear}
                          onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          disabled={isLoading}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">CVV</label>
                        <Input
                          placeholder="CVV"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          disabled={isLoading}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">Proxy (Opcional)</label>
                      <Input
                        placeholder="host:port:user:pass"
                        value={proxy}
                        onChange={(e) => setProxy(e.target.value)}
                        disabled={isLoading}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold py-2 rounded-lg transition-all"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Verificar Cartão
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="lg:col-span-2 space-y-8">
              {/* Pie Chart */}
              <Card className="bg-slate-800 border-orange-500/30 w-full">
                <CardHeader>
                  <CardTitle className="text-orange-400">Distribuição de Resultados</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Timeline Chart */}
              {timelineData.length > 0 && (
                <Card className="bg-slate-800 border-orange-500/30 w-full">
                  <CardHeader>
                    <CardTitle className="text-orange-400">Tempo de Resposta - Últimas Verificações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.05 0)" />
                        <XAxis dataKey="time" stroke="oklch(0.6 0.01 0)" />
                        <YAxis stroke="oklch(0.6 0.01 0)" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "oklch(0.15 0.01 0)",
                            border: "1px solid oklch(0.6 0.2 45)",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="responseTime"
                          stroke="oklch(0.6 0.2 45)"
                          dot={{ fill: "oklch(0.6 0.2 45)" }}
                          name="Tempo (ms)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* History Table */}
          {history.length > 0 && (
            <Card className="bg-slate-800 border-orange-500/30 mt-8 text-white w-full">
              <CardHeader>
                <CardTitle className="text-orange-400">Histórico Recente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm min-w-full">
                    <thead className="border-b border-slate-700">
                      <tr>
                        <th className="text-left py-3 px-4 text-slate-300">Cartão</th>
                        <th className="text-left py-3 px-4 text-slate-300">Tipo</th>
                        <th className="text-left py-3 px-4 text-slate-300">Status</th>
                        <th className="text-left py-3 px-4 text-slate-300">Tempo</th>
                        <th className="text-left py-3 px-4 text-slate-300">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((check: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="py-3 px-4 font-mono">****{check.cardNumber}</td>
                          <td className="py-3 px-4 capitalize">
                            <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
                              {check.cardType}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                check.classification === "Live"
                                  ? "bg-green-500/20 text-green-300"
                                  : check.classification === "Dead"
                                  ? "bg-red-500/20 text-red-300"
                                  : "bg-yellow-500/20 text-yellow-300"
                              }`}
                            >
                              {check.classification}
                            </span>
                          </td>
                          <td className="py-3 px-4">{check.responseTime}ms</td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(check.createdAt).toLocaleString("pt-BR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
