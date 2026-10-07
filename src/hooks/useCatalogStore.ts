import { useCatalogData } from './useCatalogData';
import { useAdminActions } from './useAdminActions';
import { useUI } from '../components/UIContext';
import type { AuthUser } from '../services/auth';
import type { Settings } from '../lib/settings';
import type { CatalogOrder, Category, CustomOrder, Product, Toast } from '../types';

type Actions = ReturnType<typeof useAdminActions>;

/** Tudo que o painel precisa, num objeto só: dados atuais e as ações que os alteram. */
export interface AdminApi {
  products: Product[];
  categories: Category[];
  customOrders: CustomOrder[];
  catalogOrders: CatalogOrder[];
  settings: Settings;
  user: AuthUser | null;
  saveProduct: Actions['saveProduct'];
  patchProduct: Actions['patchProduct'];
  deleteProduct: Actions['deleteProduct'];
  reorderProducts: Actions['reorderProducts'];
  saveCategory: Actions['saveCategory'];
  deleteCategory: Actions['deleteCategory'];
  reorderCategories: Actions['reorderCategories'];
  saveSettings: Actions['saveSettings'];
  undoSettings: Actions['undoSettings'];
  deleteOrder: Actions['deleteOrder'];
  updateOrderStatus: Actions['updateOrderStatus'];
}

// Junta o carregamento dos dados com as ações que os mudam. As telas recebem dados prontos e comandos;
// setters, refs de sessão e a estratégia de atualização (otimista ou recarregar) ficam aqui dentro.
export function useCatalogStore() {
  const { toast } = useUI() as { toast: Toast };
  const data = useCatalogData();
  const { saveCustomOrder, saveCatalogOrder, ...adminActions } = useAdminActions({
    toast, fetchData: data.fetchData, capabilitiesRef: data.capabilitiesRef, userRef: data.userRef,
    products: data.products, setProducts: data.setProducts, categories: data.categories, setCategories: data.setCategories,
    rawSettings: data.rawSettings, settings: data.settings,
    setCustomOrders: data.setCustomOrders, setCatalogOrders: data.setCatalogOrders,
  });

  const admin: AdminApi = {
    products: data.products, categories: data.categories, customOrders: data.customOrders, catalogOrders: data.catalogOrders,
    settings: data.settings, user: data.user,
    ...adminActions,
  };

  return {
    products: data.products, categories: data.categories, settings: data.settings, user: data.user,
    loading: data.loading, loadError: data.loadError, retryLoad: data.retryLoad,
    customOrders: data.customOrders, catalogOrders: data.catalogOrders,
    saveCustomOrder, saveCatalogOrder, // ações do cliente da vitrine
    admin,
  };
}
