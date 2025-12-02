import React from "react";
import { Route, Redirect } from "react-router-dom";

interface PublicRouteProps {
  component: React.ComponentType<any>;
  path: string;
  exact?: boolean;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ component: Component, ...rest }) => {
  const isAuth = localStorage.getItem("authenticated") === "true";

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuth ? <Redirect to="/Tultoladmin/home" /> : <Component {...props} />
      }
    />
  );
};

export default PublicRoute;


