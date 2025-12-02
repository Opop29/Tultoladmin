import React, { useEffect, useState } from "react";
import {
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonViewDidEnter,
} from "@ionic/react";
import {
  barChartOutline,
  locationOutline,
  calendarOutline,
  colorPaletteOutline,
  statsChartOutline,
  trendingUpOutline,
  mapOutline,
  timeOutline,
  archiveOutline,
  eyeOutline,
  eyeOffOutline,
} from "ionicons/icons";
import { supabase } from "../utils/supabaseClient";
import "../css/Home.css";
interface MarkType {
  id: number;
  value: string;
  label: string;
  category: string;
}

interface Marker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  mark_type: string;
  color: string;
  height: number;
  dates: any[]; // JSONB array
  created_at: string;
  updated_at: string;
  group_name?: string;
  group_index?: number;
}


interface ReportStats {
  totalMarkers: number;
  totalGroups: number;
  markersByType: { [key: string]: number };
  markersByColor: { [key: string]: number };
  markersByCategory: { [key: string]: number };
  recentActivity: Marker[];
  topLocations: { coords: string; count: number }[];
  dateDistribution: { month: string; count: number }[];
  averageHeight: number;
  outdatedMarkers: Marker[];
}

const Report: React.FC = () => {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useIonViewDidEnter(() => {
    loadReportData();
  });

  const isMarkOutdated = (marker: Marker) => {
    if (!marker.dates || marker.dates.length === 0) return false;
    
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const latestDate = marker.dates.reduce((latest: string, current: string) => {
      return current > latest ? current : latest;
    }, marker.dates[0]);
    
    return latestDate < today;
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get mark types for category mapping
      const { data: markTypes, error: markTypesError } = await supabase
        .from("mark_types")
        .select("*");

      if (markTypesError) throw markTypesError;

      // Create type to category map
      const typeToCategory: { [key: string]: string } = {};
      markTypes?.forEach(mt => {
        typeToCategory[mt.value] = mt.category;
      });

      // Get total markers count
      const { data: markers, error: markersError } = await supabase
        .from("ar_pois")
        .select("*");

      if (markersError) throw markersError;

      const totalMarkers = markers?.length || 0;

      const sortedMarkers = markers
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];

      const recentActivity = sortedMarkers.slice(0, 10);

      const outdatedMarkers = markers?.filter(marker => isMarkOutdated(marker)) || [];

      const markersByType: { [key: string]: number } = {};
      const markersByColor: { [key: string]: number } = {};
      const markersByCategory: { [key: string]: number } = {};
      const locationGroups: { [key: string]: number } = {};
      const dateGroups: { [key: string]: number } = {};
      let totalGroups = 0;
      let totalHeight = 0;

      markers?.forEach(marker => {
        const type = marker.mark_type || 'Unknown';
        markersByType[type] = (markersByType[type] || 0) + 1;

        const color = marker.color || '#007cf0';
        markersByColor[color] = (markersByColor[color] || 0) + 1;

        const category = typeToCategory[type] || 'Other';
        markersByCategory[category] = (markersByCategory[category] || 0) + 1;

        if (marker.group_name) totalGroups++;

        totalHeight += marker.height || 1;

        const lat = Math.round(marker.lat * 10) / 10;
        const lng = Math.round(marker.lng * 10) / 10;
        const key = `${lat},${lng}`;
        locationGroups[key] = (locationGroups[key] || 0) + 1;

        const date = new Date(marker.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        dateGroups[monthKey] = (dateGroups[monthKey] || 0) + 1;
      });

      const averageHeight = totalMarkers > 0 ? totalHeight / totalMarkers : 0;

      const topLocations = Object.entries(locationGroups)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([coords, count]) => ({ coords, count }));

      const dateDistribution = Object.entries(dateGroups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      setStats({
        totalMarkers,
        totalGroups,
        markersByType,
        markersByColor,
        markersByCategory,
        recentActivity,
        topLocations,
        dateDistribution,
        averageHeight,
        outdatedMarkers,
      });

    } catch (err) {
      console.error('Error loading report data:', err);
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    await loadReportData();
    event.detail.complete();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getColorName = (hexColor: string) => {
    const colorMap: { [key: string]: string } = {
      '#007cf0': 'Blue',
      '#00dfd8': 'Teal',
      '#ffc107': 'Yellow',
      '#dc3545': 'Red',
      '#28a745': 'Green',
      '#6f42c1': 'Purple',
      '#fd7e14': 'Orange',
      '#6c757d': 'Gray',
    };
    return colorMap[hexColor] || hexColor;
  };

  const getExpirationDate = (marker: Marker) => {
    if (!marker.dates || marker.dates.length === 0) return 'No expiration';
    
    const latestDate = marker.dates.reduce((latest: string, current: string) => {
      return current > latest ? current : latest;
    }, marker.dates[0]);
    
    return new Date(latestDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuButton />
            </IonButtons>
            <IonTitle>Reports & Analytics</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="home-content">
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading report data...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (error) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuButton />
            </IonButtons>
            <IonTitle>Reports & Analytics</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="home-content">
          <div className="loading-container">
            <IonIcon icon={statsChartOutline} size="large" color="danger" />
            <h3>Error Loading Reports</h3>
            <p>{error}</p>
            <button className="btn" onClick={loadReportData}>Try Again</button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Reports & Analytics</IonTitle>
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
                  <span className="title-main">📊 Analytics</span>
                  <span className="title-accent">& Reports</span>
                </h1>
                <div className="hero-taglines">
                  <p className="tagline-primary">Comprehensive insights into your AR marker ecosystem</p>
                  <p className="tagline-secondary">📈 Analyze • Track • Optimize</p>
                  <p className="tagline-tertiary">📊 Data-driven decisions for better AR experiences</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Section */}
          <div className="dashboard-section stats-section">
            <div className="section-header">
              <h2 className="section-title">📈 Key Metrics</h2>
              <p className="section-subtitle">Essential statistics and performance indicators</p>
            </div>
            <div className="section-content">
              <IonGrid className="stats-grid">
                <IonRow>
                  <IonCol size="6" sizeMd="6" sizeLg="3">
                    <IonCard className="stat-card total-markers">
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
                    <IonCard className="stat-card marker-types">
                      <IonCardContent>
                        <div className="stat-icon">
                          <IonIcon icon={barChartOutline} />
                        </div>
                        <div className="stat-content">
                          <h2>{Object.keys(stats?.markersByType || {}).length}</h2>
                          <p>Marker Types</p>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  <IonCol size="6" sizeMd="6" sizeLg="3">
                    <IonCard className="stat-card recent-activity">
                      <IonCardContent>
                        <div className="stat-icon">
                          <IonIcon icon={timeOutline} />
                        </div>
                        <div className="stat-content">
                          <h2>{stats?.totalGroups || 0}</h2>
                          <p>Grouped Markers</p>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  <IonCol size="6" sizeMd="6" sizeLg="3">
                    <IonCard className="stat-card quick-actions">
                      <IonCardContent>
                        <div className="stat-icon">
                          <IonIcon icon={colorPaletteOutline} />
                        </div>
                        <div className="stat-content">
                          <h2>{Object.keys(stats?.markersByColor || {}).length}</h2>
                          <p>Color Variations</p>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  <IonCol size="6" sizeMd="6" sizeLg="3">
                    <IonCard className="stat-card total-markers">
                      <IonCardContent>
                        <div className="stat-icon">
                          <IonIcon icon={trendingUpOutline} />
                        </div>
                        <div className="stat-content">
                          <h2>{stats?.averageHeight ? stats.averageHeight.toFixed(1) : '0'}</h2>
                          <p>Average Height</p>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>
          </div>

          {/* Analytics Charts Section */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">📊 Detailed Analytics</h2>
              <p className="section-subtitle">In-depth analysis of your AR marker data</p>
            </div>
            <div className="section-content">
              <IonGrid>
                <IonRow>
                  {/* Marker Types Distribution */}
                  <IonCol size="12" sizeLg="6">
                    <IonCard className="action-card">
                      <IonCardContent>
                        <div className="action-content">
                          <IonIcon icon={barChartOutline} />
                          <div>
                            <h3>Marker Types Distribution</h3>
                            <p>Breakdown of markers by type</p>
                          </div>
                        </div>
                        <div className="chart-container" style={{marginTop: '16px'}}>
                          {Object.entries(stats?.markersByType || {}).map(([type, count]) => (
                            <div key={type} className="chart-item" style={{display: 'flex', alignItems: 'center', marginBottom: '8px'}}>
                              <div className="chart-label" style={{flex: 1, fontSize: '14px'}}>{type}</div>
                              <div className="chart-bar" style={{flex: 2, height: '8px', background: '#e0e0e0', borderRadius: '4px', margin: '0 8px'}}>
                                <div
                                  className="chart-fill"
                                  style={{
                                    width: `${(count / (stats?.totalMarkers || 1)) * 100}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #007cf0, #00dfd8)',
                                    borderRadius: '4px'
                                  }}
                                ></div>
                              </div>
                              <div className="chart-value" style={{width: '30px', textAlign: 'right', fontSize: '14px'}}>{count}</div>
                            </div>
                          ))}
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  {/* Color Distribution */}
                  <IonCol size="12" sizeLg="6">
                    <IonCard className="action-card">
                      <IonCardContent>
                        <div className="action-content">
                          <IonIcon icon={colorPaletteOutline} />
                          <div>
                            <h3>Color Distribution</h3>
                            <p>Markers grouped by color</p>
                          </div>
                        </div>
                        <div className="color-distribution" style={{marginTop: '16px'}}>
                          {Object.entries(stats?.markersByColor || {}).map(([color, count]) => (
                            <div key={color} className="color-item" style={{display: 'flex', alignItems: 'center', marginBottom: '8px'}}>
                              <div
                                className="color-swatch"
                                style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: color, marginRight: '12px' }}
                              ></div>
                              <span className="color-name" style={{flex: 1}}>{getColorName(color)}</span>
                              <span className="color-count">{count} markers</span>
                            </div>
                          ))}
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>

                <IonRow>
                  {/* Recent Activity */}
                  <IonCol size="12" sizeLg="6">
                    <IonCard className="action-card">
                      <IonCardContent>
                        <div className="action-content">
                          <IonIcon icon={timeOutline} />
                          <div>
                            <h3>Recent Activity</h3>
                            <p>Latest marker additions</p>
                          </div>
                        </div>
                        <div className="activity-list" style={{marginTop: '16px'}}>
                          {stats?.recentActivity.slice(0, 5).map((marker, index) => (
                            <div key={marker.id || index} className="activity-item" style={{display: 'flex', alignItems: 'center', marginBottom: '12px'}}>
                              <div className="activity-icon" style={{marginRight: '12px'}}>
                                <IonIcon icon={locationOutline} />
                              </div>
                              <div className="activity-content">
                                <div className="activity-title" style={{fontWeight: '600', fontSize: '14px'}}>{marker.label}</div>
                                <div className="activity-meta" style={{fontSize: '12px', color: 'rgba(255,255,255,0.7)'}}>
                                  {marker.mark_type} • {formatDate(marker.created_at)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  {/* Top Locations */}
                  <IonCol size="12" sizeLg="6">
                    <IonCard className="action-card">
                      <IonCardContent>
                        <div className="action-content">
                          <IonIcon icon={trendingUpOutline} />
                          <div>
                            <h3>Popular Locations</h3>
                            <p>Most active marker areas</p>
                          </div>
                        </div>
                        <div className="location-list" style={{marginTop: '16px'}}>
                          {stats?.topLocations.map((location, index) => (
                            <div key={index} className="location-item" style={{display: 'flex', alignItems: 'center', marginBottom: '8px'}}>
                              <div className="location-rank" style={{width: '30px', fontWeight: 'bold', color: '#60a5fa'}}>#{index + 1}</div>
                              <div className="location-content" style={{flex: 1}}>
                                <div className="location-coords" style={{fontSize: '14px'}}>{location.coords}</div>
                                <div className="location-count" style={{fontSize: '12px', color: 'rgba(255,255,255,0.7)'}}>{location.count} markers</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>

                {/* Date Distribution Timeline */}
                <IonRow>
                  <IonCol size="12">
                    <IonCard className="action-card">
                      <IonCardContent>
                        <div className="action-content">
                          <IonIcon icon={calendarOutline} />
                          <div>
                            <h3>📅 Marker Creation Timeline</h3>
                            <p>Monthly marker creation trends and growth patterns</p>
                          </div>
                        </div>
                        <div className="timeline-container" style={{marginTop: '20px'}}>
                          {/* Timeline Header */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                            padding: '12px 16px',
                            background: 'rgba(67, 233, 123, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(67, 233, 123, 0.2)'
                          }}>
                            <div style={{display: 'flex', alignItems: 'center'}}>
                              <IonIcon icon={trendingUpOutline} style={{marginRight: '8px', color: '#43e97b'}} />
                              <span style={{fontWeight: '600', fontSize: '14px'}}>Creation Activity</span>
                            </div>
                            <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.7)'}}>
                              Total: {stats?.totalMarkers || 0} markers
                          </div>
                        </div>

                          {/* Timeline Items */}
                          <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                            {stats?.dateDistribution.map((item, index) => {
                              const percentage = Math.max((item.count / (stats?.totalMarkers || 1)) * 100, 2);
                              const maxCount = Math.max(...(stats?.dateDistribution.map(d => d.count) || [1]));
                              const intensity = (item.count / maxCount) * 100;
                              
                              return (
                                <div key={item.month} className="timeline-item" style={{
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  marginBottom: '12px',
                                  padding: '12px',
                                  background: 'rgba(255,255,255,0.03)',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  transition: 'all 0.3s ease'
                                }}>
                                  {/* Month Label */}
                                  <div className="timeline-month" style={{
                                    width: '100px', 
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: 'rgba(255,255,255,0.9)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start'
                                  }}>
                                    <span>{new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                    <span style={{fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '400'}}>
                                      {new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'long' })}
                                    </span>
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="timeline-bar" style={{
                                    flex: 1, 
                                    height: '16px', 
                                    background: 'rgba(255,255,255,0.1)', 
                                    borderRadius: '8px', 
                                    margin: '0 16px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}>
                                <div
                                  className="timeline-fill"
                                  style={{
                                        width: `${percentage}%`,
                                    height: '100%',
                                        background: `linear-gradient(90deg, 
                                          rgba(67, 233, 123, ${0.3 + (intensity / 100) * 0.7}), 
                                          rgba(56, 249, 215, ${0.3 + (intensity / 100) * 0.7}))`,
                                        borderRadius: '8px',
                                        position: 'relative',
                                        transition: 'all 0.3s ease'
                                      }}
                                    >
                                      {/* Animated shine effect */}
                                      <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: '-100%',
                                        width: '100%',
                                        height: '100%',
                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                        animation: 'shine 2s infinite'
                                      }}></div>
                                    </div>
                                    
                                    {/* Percentage label on bar */}
                                    {percentage > 15 && (
                                      <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                        color: 'white',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                      }}>
                                        {percentage.toFixed(0)}%
                                      </div>
                                    )}
                                  </div>

                                  {/* Count and Growth Indicator */}
                                  <div className="timeline-count" style={{
                                    width: '80px', 
                                    textAlign: 'right',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end'
                                  }}>
                                    <div style={{fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)'}}>
                                      {item.count}
                                    </div>
                                    <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.5)'}}>
                                      marker{item.count !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Timeline Summary */}
                          {stats?.dateDistribution && stats.dateDistribution.length > 0 && (
                            <div style={{
                              marginTop: '16px',
                              padding: '12px',
                              background: 'rgba(67, 233, 123, 0.05)',
                              borderRadius: '8px',
                              border: '1px solid rgba(67, 233, 123, 0.1)'
                            }}>
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.7)'}}>
                                  📊 Most Active: {stats.dateDistribution.reduce((max, item) => 
                                    item.count > max.count ? item : max
                                  ).month} ({Math.max(...stats.dateDistribution.map(d => d.count))} markers)
                                </div>
                                <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.7)'}}>
                                  📈 Average: {(stats.dateDistribution.reduce((sum, item) => sum + item.count, 0) / stats.dateDistribution.length).toFixed(1)} per month
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>

                {/* Outdated Marks History Panel */}
                <IonRow>
                  <IonCol size="12">
                    <IonCard className="action-card">
                      <IonCardContent>
                        <div className="action-content">
                          <IonIcon icon={archiveOutline} />
                          <div>
                            <h3>📚 Outdated Marks History</h3>
                            <p>Markers that have expired and are no longer active</p>
                          </div>
                        </div>
                        <div className="outdated-marks-container" style={{marginTop: '16px'}}>
                          {stats?.outdatedMarkers.length === 0 ? (
                            <div style={{ 
                              textAlign: 'center', 
                              padding: '20px', 
                              color: 'rgba(255,255,255,0.7)',
                              fontSize: '14px'
                            }}>
                              <IonIcon icon={eyeOffOutline} size="large" style={{marginBottom: '8px'}} />
                              <p>No outdated marks found</p>
                              <p style={{fontSize: '12px'}}>All markers are currently active</p>
                            </div>
                          ) : (
                            <div className="outdated-marks-list">
                              <div style={{ 
                                padding: '8px 12px', 
                                background: 'rgba(220, 53, 69, 0.1)', 
                                borderRadius: '8px', 
                                marginBottom: '12px',
                                fontSize: '12px',
                                color: 'rgba(255,255,255,0.8)',
                                border: '1px solid rgba(220, 53, 69, 0.3)'
                              }}>
                                📊 {stats?.outdatedMarkers.length} outdated marker{stats?.outdatedMarkers.length !== 1 ? 's' : ''} found
                              </div>
                              <IonGrid>
                                <IonRow>
                                  {stats?.outdatedMarkers.map((marker, index) => (
                                    <IonCol size="12" sizeMd="6" sizeLg="3" key={marker.id || index}>
                                      <div className="outdated-marker-item" style={{
                                        display: 'flex', 
                                        flexDirection: 'column',
                                        alignItems: 'center', 
                                        marginBottom: '12px',
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        textAlign: 'center',
                                        minHeight: '140px'
                                      }}>
                                        <div className="marker-icon" style={{marginBottom: '8px'}}>
                                          <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            backgroundColor: marker.color || '#007cf0',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            margin: '0 auto'
                                          }}></div>
                                        </div>
                                        <div className="marker-content" style={{flex: 1, width: '100%'}}>
                                          <div className="marker-title" style={{fontWeight: '600', fontSize: '14px', marginBottom: '6px', lineHeight: '1.2'}}>
                                            {marker.label}
                                          </div>
                                          <div className="marker-meta" style={{fontSize: '11px', color: 'rgba(255,255,255,0.6)'}}>
                                            <div style={{marginBottom: '4px'}}>
                                              <span style={{display: 'block'}}>{marker.mark_type}</span>
                                            </div>
                                            <div style={{color: '#ff6b6b', marginBottom: '4px', fontSize: '10px'}}>
                                              Expired: {getExpirationDate(marker)}
                                            </div>
                                            <div style={{fontSize: '10px', opacity: 0.8}}>
                                              📍 {marker.lat.toFixed(3)}, {marker.lng.toFixed(3)}
                                            </div>
                                            {marker.group_name && (
                                              <div style={{fontSize: '10px', opacity: 0.8, marginTop: '2px'}}>
                                                👥 {marker.group_name} #{marker.group_index}
                                              </div>
                                            )}
                                          </div>
                              </div>
                            </div>
                                    </IonCol>
                          ))}
                                </IonRow>
                              </IonGrid>
                            </div>
                          )}
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Report;


