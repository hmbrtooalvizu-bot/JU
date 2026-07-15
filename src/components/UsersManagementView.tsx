import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  MapPin, 
  CheckSquare, 
  Square, 
  ToggleLeft, 
  ToggleRight, 
  Pencil, 
  Lock, 
  Trash2, 
  Search, 
  Filter, 
  X, 
  Check, 
  Plus, 
  AlertCircle 
} from 'lucide-react';

export interface AdminUser {
  id: string;
  fullName: string;
  username: string;
  password?: string;
  roleAdmin: 'Super Administrador' | 'Administrador de Sede' | 'Operador de Matrícula';
  permissions: string[];
  sedes: string[]; // ['Castillo Las Lilas', ...] or ['all']
  active: boolean;
  createdAt: string;
}

interface UsersManagementViewProps {
  allSedes: string[];
  triggerToast: (msg: string) => void;
  currentUser: any;
}

const ALL_PERMISSIONS = [
  'Ver Dashboard',
  'Crear ficha',
  'Editar ficha',
  'Aprobar ficha',
  'Rechazar ficha',
  'Ver documentos',
  'Descargar documentos',
  'Ver reportes',
  'Exportar reportes',
  'Administrar usuarios',
  'Administrar sedes',
  'Configuración del sistema',
  'Ver estadísticas'
];

const DEFAULT_PERMISSIONS: Record<AdminUser['roleAdmin'], string[]> = {
  'Super Administrador': [...ALL_PERMISSIONS],
  'Administrador de Sede': [
    'Ver Dashboard',
    'Ver reportes',
    'Ver documentos',
    'Descargar documentos',
    'Ver estadísticas'
  ],
  'Operador de Matrícula': [
    'Ver Dashboard',
    'Crear ficha',
    'Editar ficha'
  ]
};

export default function UsersManagementView({ allSedes, triggerToast, currentUser }: UsersManagementViewProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleAdmin, setRoleAdmin] = useState<AdminUser['roleAdmin']>('Operador de Matrícula');
  const [active, setActive] = useState(true);
  const [selectedSedes, setSelectedSedes] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  // Load users from localStorage
  useEffect(() => {
    const loadUsers = () => {
      const stored = localStorage.getItem('jc_admin_users');
      let loadedUsers: AdminUser[] = [];
      if (stored) {
        try {
          loadedUsers = JSON.parse(stored);
        } catch (e) {
          console.error("Error loading admin users", e);
        }
      }

      // If no admin users exist, seed default ones
      if (loadedUsers.length === 0) {
        loadedUsers = [
          {
            id: 'USR-SEED1',
            fullName: 'Carlos Ramos (Sede Lilas)',
            username: 'sede_lilas',
            password: 'lilas',
            roleAdmin: 'Administrador de Sede',
            permissions: DEFAULT_PERMISSIONS['Administrador de Sede'],
            sedes: ['Castillo Las Lilas'],
            active: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 'USR-SEED2',
            fullName: 'María Castro (Operador)',
            username: 'operador1',
            password: 'operador',
            roleAdmin: 'Operador de Matrícula',
            permissions: DEFAULT_PERMISSIONS['Operador de Matrícula'],
            sedes: ['Castillo Las Lilas'],
            active: true,
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem('jc_admin_users', JSON.stringify(loadedUsers));
      }
      setUsers(loadedUsers);
    };

    loadUsers();
  }, []);

  // Save users to localStorage
  const saveUsersToStorage = (updatedUsers: AdminUser[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('jc_admin_users', JSON.stringify(updatedUsers));
  };

  // Handle Role selection change (for auto-recommending default permissions)
  const handleRoleChange = (newRole: AdminUser['roleAdmin']) => {
    setRoleAdmin(newRole);
    setSelectedPermissions(DEFAULT_PERMISSIONS[newRole]);
    if (newRole === 'Super Administrador') {
      setSelectedSedes(['all']);
    } else {
      setSelectedSedes([]);
    }
  };

  // Open creation modal
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFullName('');
    setUsername('');
    setPassword('');
    setRoleAdmin('Operador de Matrícula');
    setActive(true);
    setSelectedSedes([]);
    setSelectedPermissions(DEFAULT_PERMISSIONS['Operador de Matrícula']);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (user: AdminUser) => {
    // Cannot edit master admin inside list if it's ADMIN-MASTER, but our list doesn't include it because master is hardcoded.
    setEditingUser(user);
    setFullName(user.fullName);
    setUsername(user.username);
    setPassword(user.password || '');
    setRoleAdmin(user.roleAdmin);
    setActive(user.active);
    setSelectedSedes(user.sedes);
    setSelectedPermissions(user.permissions);
    setIsModalOpen(true);
  };

  // Handle toggle user active status
  const handleToggleActive = (user: AdminUser) => {
    const updated = users.map(u => {
      if (u.id === user.id) {
        return { ...u, active: !u.active };
      }
      return u;
    });
    saveUsersToStorage(updated);
    triggerToast(`👤 Estado de ${user.fullName} actualizado a ${!user.active ? 'Activo' : 'Inactivo'}.`);
  };

  // Delete user
  const handleDeleteUser = (user: AdminUser) => {
    const isSuperAdmin = currentUser?.roleAdmin === 'Super Administrador' || currentUser?.username === 'admin' || currentUser?.id === 'ADMIN-MASTER';
    const hasAdminUserPermission = currentUser?.permissions?.includes('Administrar usuarios');

    if (!isSuperAdmin && !hasAdminUserPermission) {
      triggerToast("❌ Solo el Super Administrador o un usuario con el permiso 'Administrar usuarios' puede eliminar usuarios.");
      return;
    }

    setUserToDelete(user);
  };

  // Perform actual delete
  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    const filtered = users.filter(u => u.id !== userToDelete.id);
    saveUsersToStorage(filtered);
    triggerToast(`🗑️ Usuario "${userToDelete.fullName}" eliminado del sistema.`);
    setUserToDelete(null);
  };

  // Submit create or edit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanName || !cleanUser || !cleanPass) {
      triggerToast("⚠️ Por favor complete el nombre completo, usuario y contraseña.");
      return;
    }

    if (roleAdmin !== 'Super Administrador' && selectedSedes.length === 0) {
      triggerToast("⚠️ Debe asignar al menos una Sede para este rol.");
      return;
    }

    if (selectedPermissions.length === 0) {
      triggerToast("⚠️ Debe seleccionar al menos un permiso.");
      return;
    }

    // Check username duplicates
    const isDuplicate = users.some(u => u.username.toLowerCase() === cleanUser && u.id !== editingUser?.id) || cleanUser === 'admin';
    if (isDuplicate) {
      triggerToast("⚠️ El nombre de usuario ya está registrado por otro administrador.");
      return;
    }

    if (editingUser) {
      // Editing
      const updated = users.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            fullName: cleanName,
            username: cleanUser,
            password: cleanPass,
            roleAdmin,
            active,
            sedes: roleAdmin === 'Super Administrador' ? ['all'] : selectedSedes,
            permissions: selectedPermissions
          };
        }
        return u;
      });
      saveUsersToStorage(updated);
      triggerToast(`✅ Usuario "${cleanName}" actualizado correctamente.`);
    } else {
      // Creating
      const newUser: AdminUser = {
        id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: cleanName,
        username: cleanUser,
        password: cleanPass,
        roleAdmin,
        active,
        sedes: roleAdmin === 'Super Administrador' ? ['all'] : selectedSedes,
        permissions: selectedPermissions,
        createdAt: new Date().toISOString()
      };
      saveUsersToStorage([...users, newUser]);
      triggerToast(`✅ Usuario "${cleanName}" creado exitosamente.`);
    }

    setIsModalOpen(false);
  };

  const handleToggleSede = (sedeName: string) => {
    if (roleAdmin === 'Super Administrador') return;
    if (selectedSedes.includes('all')) {
      setSelectedSedes([sedeName]);
    } else if (selectedSedes.includes(sedeName)) {
      setSelectedSedes(selectedSedes.filter(s => s !== sedeName));
    } else {
      setSelectedSedes([...selectedSedes, sedeName]);
    }
  };

  const handleToggleAllSedes = () => {
    if (roleAdmin === 'Super Administrador') return;
    if (selectedSedes.length === allSedes.length) {
      setSelectedSedes([]);
    } else {
      setSelectedSedes([...allSedes]);
    }
  };

  const handleTogglePermission = (perm: string) => {
    if (roleAdmin === 'Super Administrador') return;
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  const handleToggleAllPermissions = () => {
    if (roleAdmin === 'Super Administrador') return;
    if (selectedPermissions.length === ALL_PERMISSIONS.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions([...ALL_PERMISSIONS]);
    }
  };

  // Filter users list
  const filteredUsers = users.filter(user => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const matchesSearch = !cleanSearch || 
      user.fullName.toLowerCase().includes(cleanSearch) || 
      user.username.toLowerCase().includes(cleanSearch);
    const matchesRole = !roleFilter || user.roleAdmin === roleFilter;
    const matchesStatus = !statusFilter || (statusFilter === 'active' ? user.active : !user.active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header and top tools */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm uppercase tracking-wider">
            <Users className="w-4 h-4 text-brand-navy" />
            <span>Consola de Gestión de Usuarios</span>
          </div>
          <p className="text-xs text-slate-500">
            Administre las cuentas de operadores, asigne sedes autorizadas y habilite/deshabilite permisos específicos.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="w-full md:w-auto bg-brand-navy hover:bg-brand-navy/90 text-white font-bold py-2.5 px-4 rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Nuevo Usuario</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative md:col-span-2">
          <input
            type="text"
            placeholder="Buscar por nombre o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 absolute right-3 top-2.5">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-medium cursor-pointer"
        >
          <option value="">-- Todos los Roles --</option>
          <option value="Super Administrador">Super Administrador</option>
          <option value="Administrador de Sede">Administrador de Sede</option>
          <option value="Operador de Matrícula">Operador de Matrícula</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-medium cursor-pointer"
        >
          <option value="">-- Todos los Estados --</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 font-bold">Nombre / Usuario</th>
                <th className="py-3.5 px-4 font-bold">Rol Principal</th>
                <th className="py-3.5 px-4 font-bold">Sedes Asignadas</th>
                <th className="py-3.5 px-4 font-bold">Permisos Activos</th>
                <th className="py-3.5 px-4 font-bold">Estado</th>
                <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    Ningún usuario coincide con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition duration-150">
                      {/* Name / User */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-800 uppercase">{user.fullName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Usuario: {user.username}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          user.roleAdmin === 'Super Administrador' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : user.roleAdmin === 'Administrador de Sede'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-teal-50 text-teal-700 border-teal-200'
                        }`}>
                          <Shield className="w-3 h-3" />
                          {user.roleAdmin}
                        </span>
                      </td>

                      {/* Sedes */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {user.sedes.includes('all') ? (
                            <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] border border-slate-200">
                              Todas las Sedes
                            </span>
                          ) : (
                            user.sedes.map(s => (
                              <span key={s} className="bg-slate-50 text-slate-600 font-semibold px-1.5 py-0.5 rounded text-[10px] border border-slate-150 flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                {s}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Permisos */}
                      <td className="py-4 px-4">
                        <span className="text-[11px] font-bold text-slate-700">
                          {user.roleAdmin === 'Super Administrador' 
                            ? 'Acceso Total (13/13)' 
                            : `${user.permissions.length} permisos habilitados`}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleActive(user)}
                          className="flex items-center gap-1 transition text-left shrink-0 cursor-pointer"
                          title="Click para cambiar estado"
                        >
                          {user.active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
                              <Check className="w-3 h-3" />
                              ACTIVO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                              INACTIVO
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold py-1.5 px-3 rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1"
                            title="Editar usuario"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 font-bold p-1.5 rounded-lg text-[10px] transition cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE & EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-8">
            {/* Modal header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b-4 border-amber-500">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                  {editingUser ? 'Editar Usuario Administrativo' : 'Crear Nuevo Usuario Administrativo'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full transition cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Core Information Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider border-b border-slate-100 pb-1">Datos de Acceso</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-bold text-slate-700">Nombre Completo:</label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez Medina"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 font-semibold focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Username */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-bold text-slate-700">Nombre de Usuario (Para Login):</label>
                    <input
                      type="text"
                      placeholder="Ej. jperez"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 font-semibold focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Password */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-bold text-slate-700">Contraseña:</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Contraseña de acceso"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs w-full bg-white text-slate-800 font-semibold focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  {/* Role */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-bold text-slate-700">Rol del Sistema:</label>
                    <select
                      value={roleAdmin}
                      onChange={(e) => handleRoleChange(e.target.value as AdminUser['roleAdmin'])}
                      className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 font-bold cursor-pointer"
                    >
                      <option value="Super Administrador">Super Administrador (Acceso Total)</option>
                      <option value="Administrador de Sede">Administrador de Sede</option>
                      <option value="Operador de Matrícula">Operador de Matrícula</option>
                    </select>
                  </div>
                </div>

                {/* Active Switch */}
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs font-bold text-slate-700">Estado de Cuenta:</span>
                  <button
                    type="button"
                    onClick={() => setActive(!active)}
                    className="text-blue-600 focus:outline-none cursor-pointer"
                  >
                    {active ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-green-700">
                        <ToggleRight className="w-8 h-8 text-green-600 shrink-0" />
                        <span>Activo (Permite Login)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <ToggleLeft className="w-8 h-8 text-slate-300 shrink-0" />
                        <span>Inactivo (Bloquea Login)</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Sede Authorization Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Sedes Autorizadas</h4>
                  {roleAdmin !== 'Super Administrador' && (
                    <button
                      type="button"
                      onClick={handleToggleAllSedes}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                    >
                      {selectedSedes.length === allSedes.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                    </button>
                  )}
                </div>

                {roleAdmin === 'Super Administrador' ? (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold">El rol <strong>Super Administrador</strong> tiene acceso automático a todas las sedes del sistema.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {allSedes.length === 0 ? (
                      <div className="col-span-2 text-xs font-bold text-slate-400 italic">No hay sedes creadas en el sistema. Vaya a la pestaña "Distritos, Sedes y Grados" para registrarlas.</div>
                    ) : (
                      allSedes.map((sede) => {
                        const isChecked = selectedSedes.includes(sede);
                        return (
                          <button
                            key={sede}
                            type="button"
                            onClick={() => handleToggleSede(sede)}
                            className={`flex items-center gap-2 p-2.5 text-left border rounded-xl text-xs font-semibold transition cursor-pointer ${
                              isChecked 
                                ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <span className="truncate">{sede}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Permissions Checklist Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Permisos Individuales</h4>
                  {roleAdmin !== 'Super Administrador' && (
                    <button
                      type="button"
                      onClick={handleToggleAllPermissions}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                    >
                      {selectedPermissions.length === ALL_PERMISSIONS.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                    </button>
                  )}
                </div>

                {roleAdmin === 'Super Administrador' ? (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold">El rol <strong>Super Administrador</strong> dispone automáticamente de todos los permisos de la plataforma.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_PERMISSIONS.map((perm) => {
                      const isChecked = selectedPermissions.includes(perm);
                      return (
                        <button
                          key={perm}
                          type="button"
                          onClick={() => handleTogglePermission(perm)}
                          className={`flex items-center gap-2 p-2.5 text-left border rounded-xl text-xs font-semibold transition cursor-pointer ${
                            isChecked 
                              ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span>{perm}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-brand-navy hover:bg-brand-navy/95 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingUser ? 'Guardar Cambios' : 'Registrar Usuario'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-950">
                Confirmar Eliminación
              </h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Está seguro de que desea eliminar permanentemente al usuario <strong className="text-slate-900 font-extrabold uppercase">{userToDelete.fullName}</strong> (Usuario: <code className="bg-slate-100 text-slate-800 font-mono px-1 rounded">{userToDelete.username}</code>)?
            </p>
            <p className="text-[11px] text-red-500 font-bold bg-red-50/50 p-2.5 rounded-xl border border-red-100 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Esta acción es irreversible y retirará el acceso inmediato de este operador del sistema.</span>
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Usuario</span>
              </button>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
