
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { UserRole, Order, OrderStatus, ViewType, AppState, User } from './types';
import { Icons } from './constants';
import { LiquidIconButton } from './components/GlassCard';
import { useModal } from './hooks/useModal';
import { CounterOfferModal } from './components/modals/CounterOfferModal';
import { StatusModal } from './components/modals/StatusModal';
import { CancelOrderModal } from './components/modals/CancelOrderModal';
import { SenderCancelModal } from './components/modals/SenderCancelModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { AlertModal } from './components/modals/AlertModal';
import { DraftModal } from './components/modals/DraftModal';
import { SmoothEngine } from './components/SmoothEngine';

// Hooks
import { useAppVersion } from './hooks/useAppVersion';
import { useLocationTracker } from './hooks/useLocationTracker';

// API Services
import { 
    fetchAllOrders, 
    createOrder as apiCreateOrder, 
    updateOrder as apiUpdateOrder, 
    attemptAcceptOrder, 
    subscribeToOrders, 
    createReview, 
    subscribeToProfile, 
    updateUserRole, 
    getUserProfile, 
    ensureUserProfile, 
    updateUserStatus, 
    updateUserLocation,
    mapOrderFromDB 
} from './services/api';
import { supabase } from './lib/supabaseClient'; 

// Shared / Specific
import { CourierOrderDetail } from './features/courier/order-detail'; 
import { SenderOrderDetail } from './features/sender/order-detail';   
import { ChatView } from './features/shared/ChatView';

// Auth
import { StartScreen } from './features/auth/StartScreen';
import { AuthScreen } from './features/auth/AuthScreen';

// Navigation
import { LiquidNavigation } from './components/LiquidNavigation';

// Courier Features
import { CourierMarket } from './features/courier/market';
import { ActiveOrdersList } from './features/courier/active';
import { CourierRating } from './features/courier/rating';
import { CourierWallet } from './features/courier/wallet';
import { CourierProfile } from './features/courier/profile';
import { 
  PersonalDataPage, 
  DocumentsPage, 
  SecurityPage, 
  SupportPage, 
  CityPage, 
  NavigationPage 
} from './features/courier/profile/subpages';

// Sender Features
import { SenderDashboard } from './features/sender/dashboard';
import { SenderHistory } from './features/sender/history';
import { CreateOrder } from './features/sender/create';
import { SenderProfile } from './features/sender/profile';

const CURRENT_APP_VERSION = '1.6.3'; 
const NAV_STATE_KEY = 'kvant_nav_state_v1';
const DRAFT_KEY = 'kvant_order_draft';

const App: React.FC = () => {
  const { showModal, hideModal } = useModal();
  const [state, setState] = useState<AppState>({
    user: null,
    orders: [], 
    currentView: 'ORDERS_LIST',
    viewStack: ['ORDERS_LIST'],
    selectedOrderId: null
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [isRoleSwitching, setIsRoleSwitching] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [draftOrderData, setDraftOrderData] = useState<any>(null); // For recovering drafts
  
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

  const showError = (message: string) => {
      showModal(<AlertModal message={message} onClose={hideModal} type="error" />);
  };

  useAppVersion(CURRENT_APP_VERSION);

  const pushView = useCallback((view: ViewType, orderId: string | null = null) => {
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    setState(prev => ({
      ...prev,
      currentView: view,
      viewStack: [...prev.viewStack, view],
      selectedOrderId: orderId || prev.selectedOrderId
    }));
  }, []);

  const openChat = useCallback((orderId: string) => {
      pushView('CHAT', orderId);
  }, [pushView]);

  // Listener for custom 'openChat' event to support decoupled components
  useEffect(() => {
    const handleOpenChatEvent = (e: any) => {
        if (e.detail?.orderId) {
            openChat(e.detail.orderId);
        }
    };
    window.addEventListener('openChat', handleOpenChatEvent);
    return () => window.removeEventListener('openChat', handleOpenChatEvent);
  }, [openChat]);
  
  useEffect(() => {
      if (state.user) {
          const stateToSave = {
              userId: state.user.id,
              currentView: state.currentView,
              viewStack: state.viewStack,
              selectedOrderId: state.selectedOrderId
          };
          sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(stateToSave));
      }
  }, [state.currentView, state.viewStack, state.selectedOrderId, state.user]);

  useEffect(() => {
      const checkUserSession = async () => {
          setIsAuthChecking(true);
          try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                  let userProfile = await getUserProfile(session.user.id);
                  if (!userProfile) {
                      const meta = session.user.user_metadata;
                      userProfile = await ensureUserProfile({
                          id: session.user.id,
                          role: meta?.role || UserRole.SENDER,
                          name: meta?.name,
                          avatar: meta?.avatar_url
                      });
                  }

                  if (userProfile) {
                      let restoredState: Partial<AppState> = {};
                      try {
                          const savedJson = sessionStorage.getItem(NAV_STATE_KEY);
                          if (savedJson) {
                              const saved = JSON.parse(savedJson);
                              if (saved.userId === userProfile.id) {
                                  restoredState = {
                                      currentView: saved.currentView,
                                      viewStack: saved.viewStack,
                                      selectedOrderId: saved.selectedOrderId
                                  };
                              }
                          }
                      } catch (e) {
                          console.warn("Failed to restore nav state", e);
                      }

                      setState(prev => ({
                          ...prev,
                          user: userProfile,
                          currentView: restoredState.currentView || (userProfile.role === UserRole.COURIER ? 'ORDERS_LIST' : 'DASHBOARD'),
                          viewStack: restoredState.viewStack || [userProfile.role === UserRole.COURIER ? 'ORDERS_LIST' : 'DASHBOARD'],
                          selectedOrderId: restoredState.selectedOrderId || null
                      }));
                  } else {
                      await supabase.auth.signOut();
                  }
              }
          } catch (error) {
              console.error("Session check failed", error);
          } finally {
              setTimeout(() => {
                  setIsAuthChecking(false);
              }, 500);
          }
      };

      checkUserSession();
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
              checkUserSession();
          }
      });

      return () => {
          subscription.unsubscribe();
      };
  }, []);

  useEffect(() => {
      const userId = state.user?.id;
      if (!userId || isRoleSwitching) return;

      const loadData = async () => {
         try {
             const orders = await fetchAllOrders();
             setState(prev => ({ ...prev, orders }));
         } catch (e) {
             console.error("Error fetching orders:", e);
         }
      };
      loadData();

      const unsubscribeOrders = subscribeToOrders((payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          setState(prev => {
              let updatedOrders = [...prev.orders];
              if (eventType === 'INSERT') {
                  const order = mapOrderFromDB(newRecord);
                  // Prevent duplicate from optimistic update
                  if (!updatedOrders.find(o => o.id === order.id)) {
                      updatedOrders.unshift(order);
                  }
              } 
              else if (eventType === 'UPDATE') {
                  const order = mapOrderFromDB(newRecord);
                  updatedOrders = updatedOrders.map(o => o.id === order.id ? order : o);
              } 
              else if (eventType === 'DELETE') {
                  updatedOrders = updatedOrders.filter(o => o.id !== oldRecord.id);
              }
              return { ...prev, orders: updatedOrders };
          });
      });

      return () => {
          unsubscribeOrders();
      };
  }, [state.user?.id, state.user?.role, isRoleSwitching]);

  useEffect(() => {
      if (!state.user) return;
      const unsubscribeProfile = subscribeToProfile(state.user.id, (updatedUser) => {
          setState(prev => ({ ...prev, user: updatedUser }));
      });
      return () => {
          unsubscribeProfile();
      }
  }, [state.user?.id]);

  const shouldTrack = !!state.user && state.user.role === UserRole.COURIER && state.user.status === 'active';
  
  useLocationTracker(shouldTrack, (update) => {
      if (state.user) {
          updateUserLocation(state.user.id, update.location.lat, update.location.lng);
          setState(prev => {
              if (!prev.user) return prev;
              return {
                  ...prev,
                  user: {
                      ...prev.user,
                      location: update.location,
                      city: prev.user.city || update.city
                  }
              };
          });
      }
  });

  const popView = () => {
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    setState(prev => {
      if (prev.currentView === 'CREATE_ORDER') {
          setEditingOrder(null);
          setDraftOrderData(null); // Clear recovered draft on exit
      }
      if (prev.viewStack.length <= 1) return prev;
      const newStack = [...prev.viewStack];
      newStack.pop();
      const lastView = newStack[newStack.length - 1];
      return {
        ...prev,
        viewStack: newStack,
        currentView: lastView,
        selectedOrderId: lastView === 'ORDER_DETAIL' || lastView === 'CHAT' ? prev.selectedOrderId : null
      };
    });
  };

  const switchTab = (view: ViewType) => {
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    setState(prev => ({
      ...prev,
      currentView: view,
      viewStack: [view],
      selectedOrderId: null
    }));
  };

  const handleRoleSelect = (role: UserRole) => {
      setPendingRole(role);
  };

  const handleAuthSuccess = async (userProfile: User) => {
      let finalUser = userProfile;
      if (pendingRole && pendingRole !== userProfile.role) {
          try {
              setLoadingMessage('Смена роли...');
              setIsLoading(true); 
              finalUser = await updateUserRole(userProfile.id, pendingRole);
          } catch (e) {
              console.error("Failed to auto-switch role", e);
          } finally {
              setIsLoading(false);
          }
      }

      setState(prev => ({
          ...prev,
          user: finalUser,
          currentView: finalUser.role === UserRole.COURIER ? 'ORDERS_LIST' : 'DASHBOARD',
          viewStack: [finalUser.role === UserRole.COURIER ? 'ORDERS_LIST' : 'DASHBOARD']
      }));
      setPendingRole(null);
  };

  const handleAuthBack = () => {
      setPendingRole(null);
  };

  const handleRoleSwitch = async (newRole: UserRole) => {
      if (!state.user) return;
      setLoadingMessage('Смена роли...');
      setIsRoleSwitching(true);
      sessionStorage.removeItem(NAV_STATE_KEY); 
      
      try {
          await new Promise(resolve => setTimeout(resolve, 600));
          const updatedUser = await updateUserRole(state.user.id, newRole);
          setState(prev => ({
              ...prev,
              user: updatedUser,
              currentView: updatedUser.role === UserRole.COURIER ? 'ORDERS_LIST' : 'DASHBOARD',
              viewStack: [updatedUser.role === UserRole.COURIER ? 'ORDERS_LIST' : 'DASHBOARD'],
              selectedOrderId: null
          }));
          await new Promise(resolve => setTimeout(resolve, 400));
      } catch (e) {
          console.error("Role switch failed", e);
          showError("Не удалось сменить роль.");
      } finally {
          setIsRoleSwitching(false);
      }
  };

  const handleLogout = async () => {
      setLoadingMessage('Выход из системы...');
      setIsLoading(true);
      sessionStorage.removeItem(NAV_STATE_KEY);
      try {
          await supabase.auth.signOut();
          window.location.reload();
      } catch (e) {
          console.error("Logout failed", e);
          window.location.reload();
      }
  };

  const toggleCourierStatus = async () => {
    if (!state.user) return;
    const currentStatus = state.user.status || 'active';
    const newStatus = currentStatus === 'active' ? 'busy' : 'active';
    setState(prev => ({
        ...prev,
        user: { ...prev.user!, status: newStatus }
    }));
    try {
        await updateUserStatus(state.user.id, newStatus);
    } catch (e) {
        console.error("Failed to update status", e);
        setState(prev => ({
            ...prev,
            user: { ...prev.user!, status: currentStatus }
        }));
    }
    showModal(<StatusModal status={newStatus} onClose={hideModal} />);
  };

  const createOrder = async (orderData: any) => {
    if (!state.user) return;
    setLoadingMessage('Создание заказа...');
    setIsLoading(true);
    try {
        const newOrder = await apiCreateOrder({
            senderId: state.user.id,
            ...orderData,
            status: OrderStatus.PENDING,
            createdAt: Date.now(),
            counterOffers: []
        });
        
        // Optimistic Update: Add order instantly to state
        setState(prev => ({
            ...prev,
            orders: [newOrder, ...prev.orders]
        }));

        // Clear Draft
        localStorage.removeItem(DRAFT_KEY);

        popView();
    } catch (e: any) {
        let msg = e.message || 'Проверьте соединение';
        showError(`Не удалось создать заказ:\n${msg}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleUpdateOrder = async (orderId: string, updates: Partial<Order>) => {
      try {
          await apiUpdateOrder(orderId, updates);
      } catch (e) {
          console.error("Failed to update order", e);
      }
  };

  const handleEditOrderSubmit = async (data: any) => {
      if (!editingOrder) return;
      setLoadingMessage('Сохранение...');
      setIsLoading(true);
      try {
          await handleUpdateOrder(editingOrder.id, data);
          setIsLoading(false);
          popView(); 
      } catch (e) {
          console.error("Failed to edit order", e);
          setIsLoading(false);
      }
      setEditingOrder(null);
  };

  // --- DRAFT LOGIC ---
  const handleCheckDraftAndCreate = () => {
      const draftJson = localStorage.getItem(DRAFT_KEY);
      if (draftJson) {
          try {
              const draft = JSON.parse(draftJson);
              showModal(
                  <DraftModal 
                      onRestore={() => {
                          setDraftOrderData(draft);
                          pushView('CREATE_ORDER');
                          hideModal();
                      }}
                      onDiscard={() => {
                          localStorage.removeItem(DRAFT_KEY);
                          setDraftOrderData(null);
                          pushView('CREATE_ORDER');
                          hideModal();
                      }}
                      onClose={hideModal}
                  />
              );
          } catch (e) {
              // Corrupt draft, ignore
              localStorage.removeItem(DRAFT_KEY);
              pushView('CREATE_ORDER');
          }
      } else {
          setDraftOrderData(null);
          pushView('CREATE_ORDER');
      }
  };

  const acceptOrder = async (orderId: string, finalPrice: number) => {
    if (!state.user) return;
    setLoadingMessage('Принятие заказа...');
    setIsLoading(true);
    try {
        await attemptAcceptOrder(orderId, state.user.id, finalPrice);
    } catch (e: any) {
        showError(e.message || "Не удалось принять заказ. Возможно, его уже забрали.");
    } finally {
        setIsLoading(false);
    }
  };

  const handlePickupOrder = async (orderId: string) => {
    setLoadingMessage('Обновление...');
    setIsLoading(true);
    await handleUpdateOrder(orderId, { status: OrderStatus.PICKED_UP });
    setIsLoading(false);
  };

  const handleCompleteOrder = async (orderId: string) => {
     if (!state.user) return;
     setLoadingMessage('Завершение...');
     setIsLoading(true);
     await handleUpdateOrder(orderId, { 
         status: OrderStatus.COMPLETED, 
         completedAt: Date.now() 
     });
     try {
         const updatedUser = await getUserProfile(state.user.id);
         if (updatedUser) {
             setState(prev => ({ ...prev, user: updatedUser }));
         }
     } catch (e) {
         console.warn("Could not instant-refresh profile", e);
     }
     setIsLoading(false);
  };

  const handleReviewOrder = async (orderId: string) => {
      await handleUpdateOrder(orderId, { isReviewed: true });
  };

  const handleCancelOrder = async (orderId: string, reason: string) => {
      setLoadingMessage('Отмена...');
      setIsLoading(true);
      const order = state.orders.find(o => o.id === orderId);
      const isCourier = state.user?.role === UserRole.COURIER;
      
      if (isCourier && order && (order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.PICKED_UP)) {
          await handleUpdateOrder(orderId, { 
              status: OrderStatus.PENDING, 
              courierId: null as any,
              cancellationReason: reason
          });
      } else {
          await handleUpdateOrder(orderId, { 
              status: OrderStatus.CANCELLED, 
              completedAt: Date.now(),
              cancellationReason: reason
          });
      }
      
      setIsLoading(false);
      setState(prev => ({
          ...prev,
          viewStack: prev.viewStack.filter(v => v !== 'ORDER_DETAIL'),
          currentView: prev.viewStack[prev.viewStack.length - 2] || (state.user?.role === UserRole.COURIER ? 'ORDERS_LIST' : 'DASHBOARD'),
          selectedOrderId: null
      }));
  };

  const handleAcceptCounterOffer = async (orderId: string) => {
      setLoadingMessage('Назначение курьера...');
      setIsLoading(true);
      const order = state.orders.find(o => o.id === orderId);
      if (order && order.counterOffers.length > 0) {
          const lastOffer = order.counterOffers[order.counterOffers.length - 1];
          await handleUpdateOrder(orderId, {
              status: OrderStatus.ACCEPTED,
              courierId: lastOffer.courierId,
              price: lastOffer.proposedPrice
          });
      }
      setIsLoading(false);
  };

  const handleRejectCounterOffer = async (orderId: string) => {
      setLoadingMessage('Сброс предложения...');
      setIsLoading(true);
      await handleUpdateOrder(orderId, {
          status: OrderStatus.PENDING,
          counterOffers: [] 
      });
      setIsLoading(false);
  };

  const openCancelOrderModal = (orderId: string) => {
      if (state.user?.role === UserRole.SENDER) {
          showModal(<SenderCancelModal onSubmit={(reason) => handleCancelOrder(orderId, reason)} onClose={hideModal} />);
      } else {
          showModal(<CancelOrderModal onSubmit={(reason) => handleCancelOrder(orderId, reason)} onClose={hideModal} />);
      }
  };

  const openEditOrder = (order: Order) => {
      setEditingOrder(order);
      pushView('CREATE_ORDER');
  };

  const handlePayCommission = () => {
      if (!state.user) return;
      setIsLoading(true);
      setTimeout(() => {
          setIsLoading(false);
          showModal(<AlertModal title="В разработке" message="Функция оплаты комиссии скоро появится." type="info" onClose={hideModal} />);
      }, 800);
  };

  const makeCounterOffer = async (proposedPrice: number) => {
    if (!state.selectedOrderId || !state.user) return;
    const price = Number(proposedPrice);
    if (isNaN(price) || price <= 0) return;
    const currentOrder = state.orders.find(o => o.id === state.selectedOrderId);
    if (!currentOrder) return;
    const newOffer = { 
        courierId: state.user.id, 
        courierName: state.user.name, 
        proposedPrice: price, 
        timestamp: Date.now() 
    };
    const updatedOffers = [...currentOrder.counterOffers, newOffer];
    await handleUpdateOrder(state.selectedOrderId, {
        status: OrderStatus.NEGOTIATING,
        counterOffers: updatedOffers
    });
  };

  const openCounterOfferModal = () => {
      const currentOrder = state.orders.find(o => o.id === state.selectedOrderId);
      if (currentOrder) {
          showModal(<CounterOfferModal onSubmit={makeCounterOffer} onClose={hideModal} currentOrderPrice={currentOrder.price} />);
      }
  };

  const { selectedOrder, activeOrders, availableOrders, senderOrders } = useMemo(() => {
      const selected = state.orders.find(o => o.id === state.selectedOrderId);
      const courierActive = state.user?.role === UserRole.COURIER 
          ? state.orders.filter(o => o.courierId === state.user?.id && [OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.DELIVERING].includes(o.status))
          : [];
      const senderActive = state.user?.role === UserRole.SENDER
          ? state.orders.filter(o => o.senderId === state.user?.id && [OrderStatus.PENDING, OrderStatus.NEGOTIATING, OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.DELIVERING].includes(o.status))
          : [];
      const available = state.user?.role === UserRole.COURIER
          ? state.orders.filter(o => [OrderStatus.PENDING, OrderStatus.NEGOTIATING].includes(o.status))
          : state.orders; 
      const history = state.user?.role === UserRole.SENDER
          ? state.orders.filter(o => o.senderId === state.user?.id)
          : [];
      return { selectedOrder: selected, activeOrders: state.user?.role === UserRole.COURIER ? courierActive : senderActive, availableOrders: available, senderOrders: history };
  }, [state.orders, state.selectedOrderId, state.user]);

  const isInStack = (view: ViewType) => state.viewStack.includes(view);

  const getBackgroundSelector = (currentView: ViewType) => {
      const stackIndex = state.viewStack.indexOf(currentView);
      if (stackIndex <= 0) return undefined; 
      const prevView = state.viewStack[stackIndex - 1];
      switch (prevView) {
          case 'ACTIVE_ORDERS': return '#view-active-orders';
          case 'ORDER_DETAIL': return '#view-order-detail';
          case 'CREATE_ORDER': return '#view-create-order'; 
          default: return 'main > .absolute.z-0';
      }
  };

  if (isAuthChecking) {
      return (
        <div className="fixed inset-0 h-[100dvh] w-full bg-black flex flex-col items-center justify-center relative overflow-hidden z-[9999]">
            <SmoothEngine />
            <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
        </div>
      );
  }

  if (!state.user && !pendingRole) {
    return (
      <>
        <SmoothEngine />
        <StartScreen onLogin={handleRoleSelect} isLoading={isLoading} />
      </>
    );
  }

  if (!state.user && pendingRole) {
      return (
        <>
          <SmoothEngine />
          <AuthScreen role={pendingRole} onAuthSuccess={handleAuthSuccess} onBack={handleAuthBack} />
        </>
      );
  }

  if (state.user) {
      return (
        <div className="relative w-full bg-black text-white flex flex-col selection:bg-[#0A84FF]/30 overflow-hidden font-sans" style={{ height: '100vh', boxSizing: 'border-box' }}>
          <SmoothEngine />
          
          <main className="flex-1 relative w-full h-full overflow-hidden">
            {state.user.role === UserRole.COURIER && (
               <>
                 {isInStack('ORDERS_LIST') && <div className="absolute inset-0 z-0"><CourierMarket orders={availableOrders} activeOrdersCount={activeOrders.length} onOrderClick={(id) => pushView('ORDER_DETAIL', id)} onShowActiveOrders={() => pushView('ACTIVE_ORDERS')} courierStatus={state.user.status || 'active'} toggleCourierStatus={toggleCourierStatus} currentUser={state.user} /></div>}
                 {isInStack('WALLET') && <div className="absolute inset-0 bg-black z-0"><CourierWallet user={state.user} orders={state.orders} onOrderClick={(id) => pushView('ORDER_DETAIL', id)} onPayCommission={handlePayCommission} /></div>}
                 {isInStack('PROFILE') && <div className="absolute inset-0 bg-black z-0"><CourierProfile user={state.user} onSwitchRole={handleRoleSwitch} onLogout={handleLogout} onNavigate={pushView} /></div>}
               </>
            )}
            {state.user.role === UserRole.SENDER && (
               <>
                 {isInStack('DASHBOARD') && <div className="absolute inset-0 bg-black z-0">
                    <SenderDashboard 
                        user={state.user} 
                        orders={senderOrders} 
                        onOrderClick={(id) => pushView('ORDER_DETAIL', id)} 
                        onViewAll={() => switchTab('HISTORY')} 
                        onWalletClick={() => {}} 
                        onCreateOrder={handleCheckDraftAndCreate} 
                        onAcceptOffer={handleAcceptCounterOffer}
                        onRejectOffer={handleRejectCounterOffer}
                    />
                 </div>}
                 {isInStack('HISTORY') && <div className="absolute inset-0 bg-black z-0"><SenderHistory orders={senderOrders} onOrderClick={(id) => pushView('ORDER_DETAIL', id)} /></div>}
                 {isInStack('PROFILE') && <div className="absolute inset-0 bg-black z-0"><SenderProfile user={state.user} onSwitchRole={handleRoleSwitch} onLogout={handleLogout} onNavigate={pushView} /></div>}
               </>
            )}
            
            {isInStack('ACTIVE_ORDERS') && <ActiveOrdersList orders={activeOrders} onOrderClick={(id) => pushView('ORDER_DETAIL', id)} onClose={popView} zIndex={200} backgroundSelector={getBackgroundSelector('ACTIVE_ORDERS')} />}
            
            {isInStack('ORDER_DETAIL') && selectedOrder && (
                state.user.role === UserRole.SENDER 
                ? <SenderOrderDetail order={selectedOrder} onClose={popView} onCancelOrder={() => openCancelOrderModal(selectedOrder.id)} onUpdateOrder={handleUpdateOrder} onReview={() => handleReviewOrder(selectedOrder.id)} onEdit={openEditOrder} onOpenChat={openChat} zIndex={200} backgroundSelector={getBackgroundSelector('ORDER_DETAIL')} />
                : <CourierOrderDetail order={selectedOrder} currentUser={state.user} onClose={popView} onAccept={acceptOrder} onCounterOffer={openCounterOfferModal} onPickup={handlePickupOrder} onComplete={handleCompleteOrder} onCancelOrder={() => openCancelOrderModal(selectedOrder.id)} onReview={() => handleReviewOrder(selectedOrder.id)} onOpenChat={openChat} zIndex={200} backgroundSelector={getBackgroundSelector('ORDER_DETAIL')} />
            )}

            {isInStack('CHAT') && selectedOrder && state.user && (
                <ChatView 
                    order={selectedOrder} 
                    currentUser={state.user} 
                    onClose={popView} 
                    zIndex={300} 
                    backgroundSelector={getBackgroundSelector('CHAT')}
                />
            )}

            {isInStack('CREATE_ORDER') && <CreateOrder onClose={popView} onSubmit={editingOrder ? handleEditOrderSubmit : createOrder} zIndex={250} initialData={editingOrder || draftOrderData} backgroundSelector={getBackgroundSelector('CREATE_ORDER')} />}
            
            {isInStack('PROFILE_PERSONAL') && state.user && <PersonalDataPage user={state.user} onClose={popView} backgroundSelector={getBackgroundSelector('PROFILE_PERSONAL')} />}
            {isInStack('PROFILE_DOCS') && <DocumentsPage onClose={popView} backgroundSelector={getBackgroundSelector('PROFILE_DOCS')} />}
            {isInStack('PROFILE_SECURITY') && <SecurityPage onClose={popView} backgroundSelector={getBackgroundSelector('PROFILE_SECURITY')} />}
            {isInStack('PROFILE_SUPPORT') && <SupportPage onClose={popView} backgroundSelector={getBackgroundSelector('PROFILE_SUPPORT')} />}
            {isInStack('PROFILE_CITY') && state.user && <CityPage user={state.user} onClose={popView} backgroundSelector={getBackgroundSelector('PROFILE_CITY')} />}
            {isInStack('PROFILE_NAVIGATION') && <NavigationPage onClose={popView} backgroundSelector={getBackgroundSelector('PROFILE_NAVIGATION')} />}
            {isInStack('RATING') && state.user && <CourierRating user={state.user} onClose={popView} backgroundSelector={getBackgroundSelector('RATING')} />}
          </main>
          <LiquidNavigation userRole={state.user.role} currentView={state.currentView} viewStack={state.viewStack} onNavigate={switchTab} />
          <LoadingOverlay isVisible={isLoading || isRoleSwitching} message={loadingMessage} />
        </div>
      );
  }
  return null;
};

export default App;
