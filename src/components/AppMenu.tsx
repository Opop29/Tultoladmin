import React, { useRef } from "react";
import {
  IonMenu,
  IonHeader,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
} from "@ionic/react";
import { homeOutline, addCircleOutline, constructOutline, barChartOutline } from "ionicons/icons";
import "../css/Home.css";

const AppMenu: React.FC = () => {
  const firstMenuItemRef = useRef<HTMLIonItemElement>(null);

  const handleMenuDidOpen = () => {
    // Move focus to the first menu item when menu opens
    setTimeout(() => {
      if (firstMenuItemRef.current) {
        const button = firstMenuItemRef.current.querySelector('button');
        if (button) {
          button.focus();
        }
      }
    }, 100); // Small delay to ensure menu is fully open
  };

  return (
    <IonMenu contentId="main" side="start" className="sidebar-menu" onIonDidOpen={handleMenuDidOpen}>
      <IonHeader className="sidebar-header">
        <div className="sidebar-brand">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSp9gZnSEdoA-GxkfjMOZy_NaQPGNM2OIRu9jysFNX_g3kY3zqYz8ii8sVO7-FbywES96A&usqp=CAU"
            alt="Toltula-AR Logo"
            className="sidebar-logo"
          />
          <div className="sidebar-brand-text">
            <h1 className="sidebar-title">Tultol-AD</h1>
            <p className="sidebar-subtitle">admin for Augmented Reality application</p>
          </div>
        </div>
      </IonHeader>
      <IonContent className="sidebar-content">
        <div className="sidebar-welcome">
          <h3 className="welcome-title">🎉 Welcome Back!</h3>
          <p className="welcome-subtitle">You are successfully signed in</p>
          <div className="welcome-status">
            <span className="status-dot"></span>
            <span className="status-text">🟢 Online & Ready</span>
          </div>
        </div>

        <IonList className="sidebar-nav">
           <IonItem ref={firstMenuItemRef} routerLink="/Tultoladmin" button detail={false} lines="none" className="sidebar-nav-item">
             <IonIcon slot="start" icon={homeOutline} />
             <IonLabel>Home Dashboard</IonLabel>
           </IonItem>
          <IonItem routerLink="/Tultoladmin/menu" button detail={false} lines="none" className="sidebar-nav-item">
            <IonIcon slot="start" icon={addCircleOutline} />
            <IonLabel>Menu</IonLabel>
          </IonItem>
          <IonItem routerLink="/Tultoladmin/templat" button detail={false} lines="none" className="sidebar-nav-item">
            <IonIcon slot="start" icon={constructOutline} />
            <IonLabel>Template</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default AppMenu;


