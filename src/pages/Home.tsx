import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonContent,
  IonButton,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonLoading,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonRefresher,
  IonRefresherContent,
} from "@ionic/react";
import {
  locationOutline,
  mapOutline,
  constructOutline,
  barChartOutline,
  timeOutline,
  addCircleOutline,
  eyeOutline,
  analyticsOutline,
} from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import "../css/Home.css";

interface Marker {
  id: string;
  label: string;
  mark_type: string;
  color: string;
  created_at: string;
  lat: number;
  lng: number;
}

interface DashboardStats {
  totalMarkers: number;
  recentMarkers: Marker[];
  markersByType: { [key: string]: number };
}

const Home: React.FC = () => {
  const history = useHistory();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const { data: markers, error } = await supabase
        .from("ar_pois")
        .select("id, label, mark_type, color, created_at, lat, lng")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const totalMarkers = markers?.length || 0;
      const recentMarkers = markers?.slice(0, 5) || [];

  
      const markersByType: { [key: string]: number } = {};
      markers?.forEach(marker => {
        const type = marker.mark_type || 'Unknown';
        markersByType[type] = (markersByType[type] || 0) + 1;
      });

      setStats({
        totalMarkers,
        recentMarkers,
        markersByType,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    await loadDashboardData();
    event.detail.complete();
  };


  const navigateTo = (path: string) => {
    history.push(path);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuButton />
            </IonButtons>
            <IonTitle>Home</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center home-content">
          <div className="loading-container">
            <IonLoading isOpen={loading} message="Loading dashboard..." spinner="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <>
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuButton />
            </IonButtons>
            <IonTitle>Home</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="home-content">
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent></IonRefresherContent>
          </IonRefresher>

          {/* EPIC BACKGROUND ANIMATIONS */}
          <div className="floating-shapes">
            <div className="shape-1"></div>
            <div className="shape-2"></div>
            <div className="shape-3"></div>
            <div className="shape-4"></div>
            <div className="shape-5"></div>
          </div>
          <div className="wave-overlay"></div>


          {/* Main Dashboard Container */}
          <div className="dashboard-container">

            {/* Hero Section */}
            <div className="dashboard-section hero-section">
              <div className="home-hero">
                <div className="floating-particles"></div>
                <div className="hero-content">
                  <div className="hero-logo">
                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSp9gZnSEdoA-GxkfjMOZy_NaQPGNM2OIRu9jysFNX_g3kY3zqYz8ii8sVO7-FbywES96A&usqp=CAU" alt="Logo" className="app-logo enhanced-logo" />
                  </div>
                  <h1 className="home-title">
                    <span className="title-main">🏛️ Tultol</span>
                    <span className="title-accent">-AD</span>
                  </h1>
                  <div className="hero-taglines">
                    <p className="tagline-primary">Welcome back! Administer your AR marker ecosystem</p>
                    <p className="tagline-secondary">✨ Manage • Monitor • Control</p>
                    <p className="tagline-tertiary">🚀 Admin Panel for Tultola-AR</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Overview Section */}
            <div className="dashboard-section stats-section">
              <div className="section-header">
                <h2 className="section-title">📊 System Overview</h2>
                <p className="section-subtitle">Key metrics and statistics at a glance</p>
              </div>
              <div className="section-content">
                <IonGrid className="stats-grid">
                  <IonRow>
                    <IonCol size="6" sizeMd="6" sizeLg="3">
                      <IonCard className="stat-card total-markers" onClick={() => navigateTo('/Tultoladmin/menu')}>
                        <IonCardContent>
                          <div className="stat-icon">
                            <IonIcon icon={locationOutline} />
                          </div>
                          <div className="stat-content">
                            <h2>{stats?.totalMarkers || 0}</h2>
                            <p>Total Markers</p>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    </IonCol>

                    <IonCol size="6" sizeMd="6" sizeLg="3">
                      <IonCard className="stat-card marker-types" onClick={() => navigateTo('/Tultoladmin/menu')}>
                        <IonCardContent>
                          <div className="stat-icon">
                            <IonIcon icon={analyticsOutline} />
                          </div>
                          <div className="stat-content">
                            <h2>{Object.keys(stats?.markersByType || {}).length}</h2>
                            <p>Marker Types</p>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    </IonCol>

                    <IonCol size="6" sizeMd="6" sizeLg="3">
                      <IonCard className="stat-card recent-activity" onClick={() => navigateTo('/Tultoladmin/templat')}>
                        <IonCardContent>
                          <div className="stat-icon">
                            <IonIcon icon={timeOutline} />
                          </div>
                          <div className="stat-content">
                            <h2>{stats?.recentMarkers.length || 0}</h2>
                            <p>Recent Activity</p>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    </IonCol>

                    <IonCol size="6" sizeMd="6" sizeLg="3">
                      <IonCard className="stat-card quick-actions" onClick={() => navigateTo('/Tultoladmin/menu')}>
                        <IonCardContent>
                          <div className="stat-icon">
                            <IonIcon icon={addCircleOutline} />
                          </div>
                          <div className="stat-content">
                            <h2>+</h2>
                            <p>Quick Actions</p>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </div>
            </div>

            {/* Map Display Section */}
            <div className="dashboard-section map-section">
              <div className="section-content">
                <div className="map-display-container">
                  <div className="map-display">
                    <div className="map-overlay">
                      <div className="map-title">Interactive Campus Map</div>
                      <div className="map-subtitle">Explore AR markers across the university</div>
                    </div>
                    <div className="map-grid">
                      <div className="grid-line horizontal"></div>
                      <div className="grid-line horizontal"></div>
                      <div className="grid-line horizontal"></div>
                      <div className="grid-line vertical"></div>
                      <div className="grid-line vertical"></div>
                      <div className="grid-line vertical"></div>
                    </div>
                    <div className="map-markers">
                      <div className="map-marker-pulse" style={{top: '30%', left: '25%', animationDelay: '0s'}}></div>
                      <div className="map-marker-pulse" style={{top: '45%', left: '60%', animationDelay: '1s'}}></div>
                      <div className="map-marker-pulse" style={{top: '65%', left: '40%', animationDelay: '2s'}}></div>
                      <div className="map-marker-pulse" style={{top: '25%', left: '70%', animationDelay: '0.5s'}}></div>
                      <div className="map-marker-pulse" style={{top: '75%', left: '80%', animationDelay: '1.5s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Section */}
            <div className="dashboard-section actions-section">
              <div className="section-header">
                <h2 className="section-title">🚀 Quick Actions</h2>
                <p className="section-subtitle">Common administrative tasks and navigation</p>
              </div>
              <div className="section-content">
                <IonGrid className="actions-grid">
                  <IonRow>
                    <IonCol size="6" sizeMd="6">
                      <IonCard className="action-card" onClick={() => navigateTo('/Tultoladmin/menu')}>
                        <IonCardContent>
                          <div className="action-content">
                            <IonIcon icon={mapOutline} />
                            <div>
                              <h3>Add New Marker</h3>
                              <p>Place AR markers on the interactive map</p>
                            </div>
                          </div>
                          <IonIcon icon={addCircleOutline} className="action-arrow" />
                        </IonCardContent>
                      </IonCard>
                    </IonCol>

                    <IonCol size="6" sizeMd="6">
                      <IonCard className="action-card" onClick={() => navigateTo('/Tultoladmin/templat')}>
                        <IonCardContent>
                          <div className="action-content">
                            <IonIcon icon={constructOutline} />
                            <div>
                              <h3>Manage Markers</h3>
                              <p>View, edit, and organize your markers</p>
                            </div>
                          </div>
                          <IonIcon icon={eyeOutline} className="action-arrow" />
                        </IonCardContent>
                      </IonCard>
                    </IonCol>

                    <IonCol size="6" sizeMd="6">
                      <IonCard className="action-card" onClick={() => navigateTo('/Tultoladmin/menu')}>
                        <IonCardContent>
                          <div className="action-content">
                            <IonIcon icon={barChartOutline} />
                            <div>
                              <h3>View Analytics</h3>
                              <p>Explore comprehensive reports and insights</p>
                            </div>
                          </div>
                          <IonIcon icon={analyticsOutline} className="action-arrow" />
                        </IonCardContent>
                      </IonCard>
                    </IonCol>

                  </IonRow>
                </IonGrid>
              </div>
            </div>

            {/* Recent Activity Section */}
            {stats?.recentMarkers && stats.recentMarkers.length > 0 && (
              <div className="dashboard-section activity-section">
                <div className="section-header">
                  <h2 className="section-title">📅 Recent Activity</h2>
                  <p className="section-subtitle">Latest marker additions and updates</p>
                </div>
                <div className="section-content">
                  <div className="recent-activity">
                    {stats.recentMarkers.map((marker, index) => (
                      <IonCard key={marker.id} className="activity-card" onClick={() => navigateTo('/Tultoladmin/templat')}>
                        <IonCardContent>
                          <div className="activity-content">
                            <div className="activity-icon">
                              <div
                                className="marker-color-dot"
                                style={{ backgroundColor: marker.color }}
                              ></div>
                            </div>
                            <div className="activity-details">
                              <h4>{marker.label}</h4>
                              <p>{marker.mark_type} • {formatDate(marker.created_at)}</p>
                            </div>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </IonContent>
      </IonPage>
    </>
  );
};

export default Home;
