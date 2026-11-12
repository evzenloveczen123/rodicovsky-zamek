import ExpoModulesCore

// iOS blocking will use Apple's Screen Time API (FamilyControls + ManagedSettings),
// which needs the Family Controls entitlement from Apple. Until then the module
// reports itself as unsupported so the UI can explain this.
public class FocusLockModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FocusLock")

    Function("getStatus") { () -> [String: Any] in
      return [
        "supported": false,
        "locked": false,
        "pinSet": false,
        "accessibilityEnabled": false,
        "deviceAdminActive": false,
        "allowedPackages": [String](),
        "lastBlockedAt": 0,
        "retryAfterMs": 0,
        "lockUntil": 0,
        "lockStartedAt": 0,
        "message": "",
        "parentName": "",
        "parentPhone": "",
        "attempts": [[String: Any]](),
      ]
    }
  }
}
