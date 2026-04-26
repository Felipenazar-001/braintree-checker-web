import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Edit2, LogOut, X, Users, Globe, Key } from "lucide-react";
import { useLocation } from "wouter";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663390191466/iBKAWjX8tWqzHTj4SwcNCQ/IMG_5722_9f2f7c0c.png";

export default function AdminPanel() {
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", username: "", password: "", role: "user" as "user" | "admin" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: "", password: "", role: "user" as "user" | "admin" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  const listUsersQuery = trpc.admin.listUsers.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 10000, // Refresh every 10 seconds to see online status
  });
  
  const statsQuery = trpc.admin.getStats.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 10000,
  });

  const createUserMutation = trpc.admin.createUser.useMutation();
  const updateUserMutation = trpc.admin.updateUser.useMutation();
  const deleteUserMutation = trpc.admin.deleteUser.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();

  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-red-500/30 text-white">
          <CardHeader>
            <CardTitle className="text-red-400">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 mb-4">Você não tem permissão para acessar este painel.</p>
            <Button onClick={() => setLocation("/")} className="bg-purple-600 hover:bg-purple-700">
              Voltar ao Checker
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.password) {
      setMessage("Preencha todos os campos");
      setMessageType("error");
      return;
    }

    try {
      const result = await createUserMutation.mutateAsync(newUser);
      if (result.success) {
        setMessage(result.message || "Usuário criado com sucesso");
        setMessageType("success");
        setNewUser({ name: "", username: "", password: "", role: "user" });
        setShowCreateForm(false);
        listUsersQuery.refetch();
        statsQuery.refetch();
      } else {
        setMessage(result.error || "Erro ao criar usuário");
        setMessageType("error");
      }
    } catch (error) {
      setMessage(String(error));
      setMessageType("error");
    }
  };

  const handleUpdateUser = async (userId: number) => {
    try {
      const result = await updateUserMutation.mutateAsync({
        id: userId,
        ...editData,
      });
      if (result.success) {
        setMessage(result.message || "Usuário atualizado");
        setMessageType("success");
        setEditingId(null);
        listUsersQuery.refetch();
      } else {
        setMessage(result.error || "Erro ao atualizar");
        setMessageType("error");
      }
    } catch (error) {
      setMessage(String(error));
      setMessageType("error");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Tem certeza que deseja deletar este usuário?")) return;

    try {
      const result = await deleteUserMutation.mutateAsync({ id: userId });
      if (result.success) {
        setMessage(result.message || "Usuário deletado");
        setMessageType("success");
        listUsersQuery.refetch();
        statsQuery.refetch();
      } else {
        setMessage(result.error || "Erro ao deletar");
        setMessageType("error");
      }
    } catch (error) {
      setMessage(String(error));
      setMessageType("error");
    }
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-5 bg-cover bg-center"
        style={{ backgroundImage: `url(${LOGO_URL})` }}
      />

      <div className="relative z-10">
        <div className="bg-gradient-to-r from-violet-600 to-purple-500 text-white py-6 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">ONE LEGEND - Painel Admin</h1>
              <p className="text-purple-100">Gerenciamento de Usuários e Estatísticas</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setLocation("/")}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                Voltar ao Checker
              </Button>
              <Button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-slate-800 border-purple-500/30 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Total de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-400">
                  {statsQuery.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : statsQuery.data?.totalUsers || 0}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-green-500/30 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Usuários Online
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">
                  {statsQuery.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : statsQuery.data?.onlineUsers || 0}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-blue-500/30 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Key className="w-4 h-4" /> Total de Logins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-400">
                  {statsQuery.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : statsQuery.data?.totalLogins || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                messageType === "success"
                  ? "bg-green-500/20 border border-green-500/50 text-green-300"
                  : messageType === "error"
                    ? "bg-red-500/20 border border-red-500/50 text-red-300"
                    : "bg-blue-500/20 border border-blue-500/50 text-blue-300"
              }`}
            >
              {message}
            </div>
          )}

          <Card className="bg-slate-800 border-purple-500/30 text-white mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400">
                <Plus className="w-5 h-5" />
                {showCreateForm ? "Criar Novo Usuário" : "Novo Usuário"}
              </CardTitle>
            </CardHeader>
            {showCreateForm && (
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateUser();
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Nome completo"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <Input
                      placeholder="Username (login)"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      type="password"
                      placeholder="Senha"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "user" | "admin" })}
                      className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                    >
                      <option value="user">Usuário</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={createUserMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {createUserMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        "Criar Usuário"
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      variant="outline"
                      className="border-slate-600 text-slate-300"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
            {!showCreateForm && (
              <CardContent>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
              </CardContent>
            )}
          </Card>

          <Card className="bg-slate-800 border-purple-500/30 text-white">
            <CardHeader>
              <CardTitle className="text-purple-400">Usuários Cadastrados</CardTitle>
              <CardDescription className="text-slate-400">
                Gerencie as contas de acesso ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {listUsersQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
              ) : listUsersQuery.data && listUsersQuery.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-700">
                      <tr>
                        <th className="text-left py-3 px-4 text-slate-300">Status</th>
                        <th className="text-left py-3 px-4 text-slate-300">Nome</th>
                        <th className="text-left py-3 px-4 text-slate-300">Username</th>
                        <th className="text-left py-3 px-4 text-slate-300">Role</th>
                        <th className="text-left py-3 px-4 text-slate-300">Logins</th>
                        <th className="text-left py-3 px-4 text-slate-300">Último Acesso</th>
                        <th className="text-left py-3 px-4 text-slate-300">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listUsersQuery.data.map((u) => (
                        <tr key={u.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                              <span className="text-xs text-slate-400">{u.isOnline ? 'Online' : 'Offline'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium">{u.name}</td>
                          <td className="py-3 px-4 text-slate-400">{u.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-700 text-slate-300'}`}>
                              {u.role === 'admin' ? 'Admin' : 'User'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{u.loginCount || 0}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleString('pt-BR') : 'Nunca'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(u.id);
                                  setEditData({ name: u.name || "", password: "", role: u.role as "user" | "admin" });
                                }}
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                disabled={u.id === user?.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">Nenhum usuário encontrado.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      {editingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="bg-slate-800 border-purple-500/30 text-white w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-purple-400">Editar Usuário</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Nome</label>
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Nova Senha (deixe em branco para manter)</label>
                  <Input
                    type="password"
                    value={editData.password}
                    onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Role</label>
                  <select
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value as "user" | "admin" })}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                  >
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <Button
                  onClick={() => handleUpdateUser(editingId)}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
