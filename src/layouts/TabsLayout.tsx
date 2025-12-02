import React, { useState, useEffect } from "react";
import { Redirect, Route, useLocation } from "react-router-dom";
import {
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from "@ionic/react";
import { homeOutline, addCircleOutline, constructOutline, barChartOutline } from "ionicons/icons";
import "../css/Tabs.css";
import AppMenu from "../components/AppMenu";
import { menuController } from "@ionic/core";
import ProtectedRoute from "../components/ProtectedRoute";
import PublicRoute from "../components/PublicRoute";
import Home from "../pages/Home";
import MapMarker from "../pages/MapMarker";
import Builded from "../pages/Builded";
import Report from "../pages/Report";
import EnterPasscode from "../pages/EnterPasscode";

const TabsLayout: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleMenuOpen = () => setMenuOpen(true);
    const handleMenuClose = () => setMenuOpen(false);

    document.addEventListener('ionMenuDidOpen', handleMenuOpen);
    document.addEventListener('ionMenuDidClose', handleMenuClose);

    return () => {
      document.removeEventListener('ionMenuDidOpen', handleMenuOpen);
      document.removeEventListener('ionMenuDidClose', handleMenuClose);
    };
  }, []);

  useEffect(() => {
    const mainOutlet = document.getElementById('main');
    if (mainOutlet) {
      if (menuOpen) {
        mainOutlet.setAttribute('inert', '');
      } else {
        mainOutlet.removeAttribute('inert');
      }
    }
  }, [menuOpen]);
  return (
    <>
      <AppMenu />
      <IonTabs>
        <IonRouterOutlet id="main">
          <Route exact path="/">
            <Redirect to="/Tultoladmin/enter-passcode" />
          </Route>
          <PublicRoute exact path="/Tultoladmin/enter-passcode" component={EnterPasscode} />
          <ProtectedRoute exact path="/Tultoladmin/home" component={Home} />
          <ProtectedRoute exact path="/Tultoladmin/MapMarker" component={MapMarker} />
          <ProtectedRoute exact path="/Tultoladmin/builded" component={Builded} />
          <ProtectedRoute exact path="/Tultoladmin/report" component={Report} />
          <Route exact path="/Tultoladmin">
            <Redirect to="/Tultoladmin/enter-passcode" />
          </Route>
        </IonRouterOutlet>

        {location.pathname !== '/Tultoladmin/enter-passcode' && (
          <IonTabBar slot="bottom" className="tabs-bar">
          <IonTabButton tab="home" href="/Tultoladmin/home" className="tab-btn">
            <IonIcon icon={homeOutline} />
            <IonLabel>Home</IonLabel>
            <span className="tab-indicator" />
          </IonTabButton>
          <IonTabButton tab="create" href="/Tultoladmin/MapMarker" className="tab-btn">
            <IonIcon icon={addCircleOutline} />
            <IonLabel>MapMarker</IonLabel>
            <span className="tab-indicator" />
          </IonTabButton>
          <IonTabButton tab="builded" href="/Tultoladmin/builded" className="tab-btn">
            <IonIcon icon={constructOutline} />
            <IonLabel>Builded</IonLabel>
            <span className="tab-indicator" />
          </IonTabButton>
          <IonTabButton tab="report" href="/Tultoladmin/report" className="tab-btn">
            <IonIcon icon={barChartOutline} />
            <IonLabel>Report</IonLabel>
            <span className="tab-indicator" />
          </IonTabButton>
        </IonTabBar>
        )}
      </IonTabs>
    </>
  );
};

export default TabsLayout;


