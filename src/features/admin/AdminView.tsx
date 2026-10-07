import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, PauseCircle } from 'lucide-react';
import CatalogOrdersManager from './pedidos/CatalogOrders';
import { CustomOrdersManager } from './pedidos/OrderManagers';
import ProductManager from './produtos/ProductManager';
import CategoryManager from './categorias/CategoryManager';
import SiteSettings from './site/SiteSettings';
import AuraManager from './auras/AuraManager';
import TeamManager from './equipe/TeamManager';
import ErrorsManager from './erros/ErrorsManager';
import PriceCalculator from './calculadora/PriceCalculator';
import AdminNav, { buildNav, type NavId } from './AdminNav';
import { useUI } from '../../components/UIContext';
import { Button } from '../../components/ui';
import { gateway } from '../../services/gateway';
import { schemaMessage } from '../../lib/schema';
import type { SchemaStatus } from '../../lib/schema';
import { statusInfo } from '../../lib/format';
import type { AuraLib } from '../../lib/auras';
import type { AdminApi } from '../../hooks/useCatalogStore';
import type { OrderTable } from '../../types';

interface AdminViewProps {
  admin: AdminApi;
  onSelectOrder: (table: OrderTable, id: string) => void;
  onDeleteOrder: (table: OrderTable, id: string) => unknown;
}

export default function AdminView({ admin, onSelectOrder, onDeleteOrder }: AdminViewProps) {
  const { products, categories, customOrders, catalogOrders, settings, user } = admin;
  const { confirm } = useUI();
  const [active, setActive] = useState<NavId>('orders');
  const [productFilter, setProductFilter] = useState<{ key: number; value: string }>({ key: 0, value: '' });
  const [schema, setSchema] = useState<SchemaStatus | null>(null);
  useEffect(() => {
    let alive = true;
    gateway().loadSchemaStatus().then(status => { if (alive) setSchema(status); });
    return () => { alive = false; };
  }, []);

  // Alterações do Site ainda não publicadas: avisa antes de trocar de área (senão se perdem)
  const siteDirty = useRef(false);
  const onSiteDirty = useCallback((d: boolean) => { siteDirty.current = d; }, []);
  const go = async (id: NavId) => {
    if (id === active) return;
    const leavingSite = active.startsWith('site:') && !id.startsWith('site:');
    if (leavingSite && siteDirty.current && !(await confirm({
      title: 'Sair sem publicar?', message: 'Você mudou configurações do site que ainda não foram publicadas. Se sair agora, elas se perdem.', confirmLabel: 'Sair sem publicar',
    }))) return;
    setActive(id);
    window.scrollTo({ top: 0 });
  };
  const showProducts = (value: string) => { setProductFilter(f => ({ key: f.key + 1, value })); go('products'); };

  const newCount = (list: { status?: unknown }[]) => list.filter(o => statusInfo(o.status).id === 'novo').length;
  const sections = buildNav({
    products: products.length, categories: categories.length, orders: catalogOrders.length,
    newOrders: newCount(catalogOrders), newCustom: newCount(customOrders), customOrders: customOrders.length,
    customEnabled: settings.customEnabled, aurasEnabled: settings.aurasEnabled,
  });
  const siteGroup = active.startsWith('site:') ? active.slice(5) : null;

  return (
    <div className="xl:flex xl:gap-8 xl:items-start">
      <AdminNav sections={sections} active={active} onSelect={go} />
      <div className="flex-1 min-w-0">
        {schema && !schema.ok && (
          <div role="alert" className="mb-4 p-4 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{schemaMessage(schema)}</span>
          </div>
        )}
        {settings.ordersPaused && active === 'orders' && (
          <div role="status" className="mb-4 p-4 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="flex items-start gap-2 flex-1"><PauseCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span><strong>Pedidos pausados.</strong> A loja está no ar, mas os clientes não conseguem enviar pedidos novos.</span></span>
            <Button size="sm" onClick={() => go('site:pedidos')}>Retomar pedidos</Button>
          </div>
        )}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6">
          {active === 'orders' && (
            <CatalogOrdersManager
              orders={catalogOrders}
              onDelete={(id) => onDeleteOrder('orders', id)}
              onSelectOrder={(id) => onSelectOrder('orders', id)}
              onUpdateStatus={(id, status) => admin.updateOrderStatus('orders', id, status)}
            />
          )}
          {active === 'custom_orders' && (
            <CustomOrdersManager
              customOrders={customOrders}
              onDelete={(id) => onDeleteOrder('custom_orders', id)}
              onSelectOrder={(id) => onSelectOrder('custom_orders', id)}
              onUpdateStatus={(id, status) => admin.updateOrderStatus('custom_orders', id, status)}
            />
          )}
          {active === 'products' && (
            <ProductManager
              key={productFilter.key} initialFilter={productFilter.value}
              products={products} categories={categories} onSave={admin.saveProduct} onPatch={admin.patchProduct} onDelete={admin.deleteProduct} onReorder={admin.reorderProducts}
              onOpenSettings={(group) => go(`site:${group}`)}
            />
          )}
          {active === 'categories' && (
            <CategoryManager
              categories={categories} products={products} onSave={admin.saveCategory} onDelete={admin.deleteCategory} onReorder={admin.reorderCategories}
              onShowProducts={(categoryId) => showProducts(`cat:${categoryId}`)}
            />
          )}
          {active === 'auras' && settings.aurasEnabled && (
            <AuraManager
              lib={settings.auraLib} products={products} categories={categories}
              onSave={({ custom, overrides }: AuraLib) => admin.saveSettings({
                customAuras: custom.length ? JSON.stringify(custom) : null,
                auraOverrides: Object.keys(overrides).length ? JSON.stringify(overrides) : null
              }, 'Auras atualizadas.')}
            />
          )}
          {siteGroup && (
            <SiteSettings
              settings={settings} categories={categories} products={products}
              group={siteGroup} onGroupChange={(g) => go(`site:${g}`)} onDirtyChange={onSiteDirty} onShowProducts={showProducts}
              onSave={admin.saveSettings} onUndo={admin.undoSettings}
            />
          )}
          {active === 'calculator' && <PriceCalculator products={products} onPatchProduct={admin.patchProduct} />}
          {active === 'team' && <TeamManager currentEmail={user?.email} />}
          {active === 'errors' && <ErrorsManager />}
        </div>
      </div>
    </div>
  );
}
