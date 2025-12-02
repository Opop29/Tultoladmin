import React from "react";
import { Route, Redirect } from "react-router-dom";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  path: string | string[];
  exact?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  component: Component,
  ...rest
}) => {
  const isAuth = localStorage.getItem("authenticated") === "true";

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuth ? <Component {...props} /> : <Redirect to="/Tultoladmin/enter-passcode" />
      }
    />
  );
};

export default ProtectedRoute;
