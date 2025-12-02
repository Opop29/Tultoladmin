import React from "react";
import { Route, Redirect } from "react-router-dom";

interface PublicRouteProps {
  component: React.ComponentType<any>;
  path: string;
  exact?: boolean;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ component: Component, ...rest }) => {
  return (
    <Route
      {...rest}
      component={Component}
    />
  );
};

export default PublicRoute;


