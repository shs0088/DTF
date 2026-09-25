import json
from odoo.tests.common import HttpCase, tagged

@tagged("post_install", "-at_install")
class TestDTFM9Auth(HttpCase):
    def _post(self,path,payload):
        return self.url_open(path,data=json.dumps(payload),headers={"Content-Type":"application/json"})

    def test_customer_registration_creates_native_portal_session(self):
        email="m9-customer@example.test"; password="M9-customer-pass"
        response=self._post("/api/dtf/v1/auth/register",{"displayName":"M9 Customer","email":email,"password":password,"role":"customer"})
        self.assertEqual(response.status_code,201)
        user=self.env["res.users"].sudo().search([("login","=",email)],limit=1)
        self.assertTrue(user); self.assertTrue(user.has_group("base.group_portal"))
        self.assertFalse(user.has_group("dtf_core.group_dtf_designer"))
        self.assertTrue(user.partner_id.dtf_customer_enabled)
        session=self.url_open("/api/dtf/v1/auth/session")
        self.assertEqual(session.status_code,200); self.assertEqual(session.json()["role"],"customer")

    def test_designer_registration_uses_native_designer_group_and_profile(self):
        email="m9-designer@example.test"; password="M9-designer-pass"
        response=self._post("/api/dtf/v1/auth/register",{"displayName":"M9 Designer","email":email,"password":password,"role":"designer"})
        self.assertEqual(response.status_code,201)
        user=self.env["res.users"].sudo().search([("login","=",email)],limit=1)
        self.assertTrue(user.has_group("dtf_core.group_dtf_designer")); self.assertTrue(user.has_group("base.group_portal"))
        profile=self.env["dtf.designer.profile"].sudo().search([("user_id","=",user.id)],limit=1)
        self.assertTrue(profile); self.assertEqual(profile.partner_id,user.partner_id)

    def test_registration_rejects_privileged_role(self):
        response=self._post("/api/dtf/v1/auth/register",{"displayName":"No Admin","email":"no-admin@example.test","password":"M9-password","role":"admin"})
        self.assertEqual(response.status_code,400); self.assertEqual(response.json()["error"],"role_not_allowed")
